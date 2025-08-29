/* eslint-disable no-console */
const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { isAfter, addMinutes, subMinutes, addHours, addDays, addWeeks, addMonths } = require('date-fns');

admin.initializeApp();
const db = admin.firestore();
const HOMEPAGE_URL = 'https://pmobile78.github.io/to-round-react';
const en = require('./locales/notifications.en.json');
const uk = require('./locales/notifications.uk.json');

// Data model notes:
// - NEW: User bubbles stored in subcollection `user-bubbles/{uid}/bubbles/{bubbleId}` (one doc per task)
// - LEGACY: Previously, user bubbles were stored in `user-bubbles/{uid}` with array field `bubbles`
// - FCM token stored in doc `user-fcm-tokens/{uid}` with field `token`

async function fetchAllUserBubbles() {
    // Try normalized schema via collectionGroup first
    const grouped = new Map(); // userId -> bubbles[]
    const cg = await db.collectionGroup('bubbles').get();
    cg.forEach((d) => {
        const parentUserDoc = d.ref.parent.parent; // user-bubbles/{uid}
        const userId = parentUserDoc?.id;
        if (!userId) return;
        const list = grouped.get(userId) || [];
        const bubbleData = d.data() || {};
        list.push(Object.assign({ id: d.id }, bubbleData));
        grouped.set(userId, list);
    });
    if (grouped.size > 0) {
        return Array.from(grouped.entries()).map(([userId, bubbles]) => ({ userId, bubbles }));
    }

    // Fallback to legacy array-based storage
    const snapshot = await db.collection('user-bubbles').get();
    const results = [];
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        results.push({ userId: docSnap.id, bubbles: data?.bubbles || [] });
    });
    return results;
}

async function getUserFcmTokens(userId) {
    const col = await db.collection('user-fcm-tokens').doc(userId).collection('tokens').get();
    const tokens = [];
    col.forEach((d) => {
        const data = d.data() || {};
        const t = data.token || d.id;
        if (t) tokens.push({ id: d.id, token: t, language: data.language || '' });
    });
    return tokens;
}

function normalizeLang(lang) {
    if (!lang || typeof lang !== 'string') return 'en';
    const base = lang.toLowerCase().split('-')[0];
    if (base === 'ru') return 'en'; // requested: remove Russian
    return (base === 'uk' || base === 'en') ? base : 'en';
}

function interpolate(template, vars) {
    return String(template).replace(/\{\{(\w+)\}\}/g, (_, k) => {
        const v = vars[k];
        return v == null ? '' : String(v);
    });
}

function buildTextsPerLang(tokenLanguage, type, minutesBefore, bubbleTitle) {
    const lang = normalizeLang(tokenLanguage);
    const dict = lang === 'uk' ? uk : en;
    const hasTitle = typeof bubbleTitle === 'string' && bubbleTitle.trim().length > 0;
    if (type === 'reminder') {
        return {
            title: dict.reminder.title,
            body: hasTitle
                ? interpolate(dict.reminder.bodyWithTitle, { minutes: minutesBefore, title: bubbleTitle })
                : interpolate(dict.reminder.bodyNoTitle, { minutes: minutesBefore })
        };
    }
    return {
        title: dict.overdue.title,
        body: hasTitle
            ? interpolate(dict.overdue.bodyWithTitle, { title: bubbleTitle })
            : dict.overdue.bodyNoTitle
    };
}

async function sendFcmToUser(userId, payload) {
    const tokens = await getUserFcmTokens(userId);
    if (!tokens.length) return { skipped: true, reason: 'no-token' };

    const url = payload?.data?.url;
    const type = (payload?.data?.type || '').toString();
    const minutesBefore = Number(payload?.data?.minutesBefore);
    const bubbleTitle = payload?.data?.bubbleTitle || '';

    const results = [];
    for (const { id, token } of tokens) {
        try {
            const tokenObj = tokens.find(t => t.token === token);
            const { title, body } = buildTextsPerLang(tokenObj?.language, type, minutesBefore, bubbleTitle);
            await admin.messaging().send({
                token,
                data: Object.assign({}, payload.data || {}, { title, body }),
                webpush: {
                    fcmOptions: url ? { link: url } : undefined,
                    headers: { TTL: '86400', Urgency: 'high' }
                }
            });
            results.push({ token, ok: true });
        } catch (e) {
            console.error('FCM send error for token', token, e?.code, e?.message);
            results.push({ token, ok: false, error: e });
            // Cleanup invalid tokens
            const code = e?.errorInfo?.code || e?.code || '';
            if (String(code).includes('registration-token-not-registered') || String(code).includes('invalid-argument')) {
                await db.collection('user-fcm-tokens').doc(userId).collection('tokens').doc(id).delete().catch(() => { });
            }
        }
    }
    return { ok: true, results };
}

// Helper: decide if bubble is overdue
function isBubbleOverdue(bubble) {
    if (!bubble || !bubble.dueDate) return false;
    try {
        const due = new Date(bubble.dueDate);
        return isAfter(new Date(), due);
    } catch (_) {
        return false;
    }
}

// Helper: upcoming reminders based on bubble.notifications
// bubble.notifications: array like [{ minutesBefore: 5 }, { minutesBefore: 60 }]
function shouldTriggerReminderNow(bubble, now) {
    if (!bubble?.dueDate || !Array.isArray(bubble.notifications)) return null;
    const due = new Date(bubble.dueDate);
    for (const notif of bubble.notifications) {
        const minutesBefore = computeMinutesBefore(notif);
        if (!Number.isFinite(minutesBefore)) continue;
        const scheduled = subMinutes(due, minutesBefore);
        // Trigger if now is within 1 minute window after scheduled
        const windowEnd = addMinutes(scheduled, 1);
        if (isAfter(now, scheduled) && !isAfter(now, windowEnd)) {
            return { minutesBefore };
        }
    }
    return null;
}

// Compute minutesBefore from different client schemas: string presets, custom object, or numeric field
function computeMinutesBefore(notif) {
    if (notif == null) return NaN;
    if (typeof notif === 'number') return notif; // already minutes
    if (typeof notif === 'string') {
        // e.g. '5m', '10m', '15m', '1h', '1d'
        const match = notif.match(/^(\d+)([mhdw])$/i);
        if (!match) return NaN;
        const value = Number(match[1]);
        const unit = match[2].toLowerCase();
        switch (unit) {
            case 'm': return value;
            case 'h': return value * 60;
            case 'd': return value * 24 * 60;
            case 'w': return value * 7 * 24 * 60;
            default: return NaN;
        }
    }
    // custom object
    if (typeof notif === 'object') {
        if (Number.isFinite(notif.minutesBefore)) return Number(notif.minutesBefore);
        const value = Number(notif.value);
        if (!Number.isFinite(value) || value <= 0) return NaN;
        switch (notif.unit) {
            case 'minutes': return value;
            case 'hours': return value * 60;
            case 'days': return value * 24 * 60;
            case 'weeks': return value * 7 * 24 * 60;
            default: return NaN;
        }
    }
    return NaN;
}

// De-dup: ensure we don't send the same notification twice for the same dueDate
async function wasNotificationSent(key) {
    const ref = db.collection('notification-sent').doc(key);
    const snap = await ref.get();
    return snap.exists;
}

async function markNotificationSent(key) {
    const ref = db.collection('notification-sent').doc(key);
    await ref.set({ sentAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

function buildReminderKey(userId, bubble, minutesBefore) {
    return `reminder:${userId}:${String(bubble.id)}:${String(minutesBefore)}:${String(bubble.dueDate)}`;
}

function buildOverdueKey(userId, bubble) {
    return `overdue:${userId}:${String(bubble.id)}:${String(bubble.dueDate)}`;
}

function computeNextDueDate(currentDue, recurrence) {
    const every = Number(recurrence?.every) || 1;
    const unit = String(recurrence?.unit || 'days');

    // Special handling for weekly recurrence with specific week days
    if (unit === 'weeks' && Array.isArray(recurrence?.weekDays) && recurrence.weekDays.length > 0) {
        return computeNextWeeklyDueDate(currentDue, recurrence.weekDays, every);
    }

    switch (unit) {
        case 'minutes': return addMinutes(currentDue, every);
        case 'hours': return addHours(currentDue, every);
        case 'days': return addDays(currentDue, every);
        case 'weeks': return addWeeks(currentDue, every);
        case 'months': return addMonths(currentDue, every);
        default: return addDays(currentDue, every);
    }
}

function computeNextWeeklyDueDate(currentDue, weekDays, every) {
    // Sort week days (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const sortedWeekDays = [...weekDays].sort((a, b) => a - b);

    // Get current day of week (0-6)
    const currentDayOfWeek = currentDue.getDay();

    // Find the next occurrence in the current week
    let nextDayOfWeek = null;
    for (const day of sortedWeekDays) {
        if (day > currentDayOfWeek) {
            nextDayOfWeek = day;
            break;
        }
    }

    // If no next day in current week, go to first day of next week cycle
    if (nextDayOfWeek === null) {
        nextDayOfWeek = sortedWeekDays[0];

        // Calculate how many days to add to get to the next occurrence
        let daysToAdd;
        if (every === 1) {
            // For every week: just go to next week's target day
            daysToAdd = (7 - currentDayOfWeek + nextDayOfWeek) % 7;
            if (daysToAdd === 0) daysToAdd = 7; // If same day, go to next week
        } else {
            // For every N weeks: add N weeks, then adjust to target day
            const nextDate = addWeeks(currentDue, every);
            daysToAdd = (nextDayOfWeek - nextDate.getDay() + 7) % 7;
            return addDays(nextDate, daysToAdd);
        }

        return addDays(currentDue, daysToAdd);
    } else {
        // Same week, just different day
        const daysToAdd = nextDayOfWeek - currentDayOfWeek;
        return addDays(currentDue, daysToAdd);
    }
}

async function updateBubbleDueDate(userId, bubbleId, nextDue) {
    const subDoc = db.collection('user-bubbles').doc(userId).collection('bubbles').doc(String(bubbleId));
    const subSnap = await subDoc.get();
    if (subSnap.exists) {
        await subDoc.set({ dueDate: nextDue.toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
        await db.collection('user-bubbles').doc(userId).set({ updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return;
    }
    // Legacy fallback: array in parent doc
    const docRef = db.collection('user-bubbles').doc(userId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) return;
    const data = snapshot.data() || {};
    const list = Array.isArray(data.bubbles) ? data.bubbles : [];
    const updated = list.map(b => (b.id === bubbleId ? { ...b, dueDate: nextDue.toISOString(), updatedAt: new Date().toISOString() } : b));
    await docRef.set({ ...data, bubbles: updated, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

async function updateBubbleFields(userId, bubbleId, fields) {
    const subDoc = db.collection('user-bubbles').doc(userId).collection('bubbles').doc(String(bubbleId));
    const subSnap = await subDoc.get();
    const payload = Object.assign({}, fields, { updatedAt: new Date().toISOString() });
    if (subSnap.exists) {
        await subDoc.set(payload, { merge: true });
        await db.collection('user-bubbles').doc(userId).set({ updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return;
    }
    // Legacy fallback
    const docRef = db.collection('user-bubbles').doc(userId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) return;
    const data = snapshot.data() || {};
    const list = Array.isArray(data.bubbles) ? data.bubbles : [];
    const updated = list.map(b => (b.id === bubbleId ? { ...b, ...payload } : b));
    await docRef.set({ ...data, bubbles: updated, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

// Runs every minute to check reminders and overdue tasks (Gen 2)
exports.scheduleDueDateNotifications = onSchedule({
    schedule: 'every 1 minutes',
    region: 'europe-west1'
}, async (event) => {
    const now = new Date();
    const users = await fetchAllUserBubbles();

    for (const { userId, bubbles } of users) {
        for (const bubble of bubbles) {
            if (!bubble || bubble.status !== 'active') continue;

            // 1) Reminder notifications
            const reminder = shouldTriggerReminderNow(bubble, now);
            if (reminder) {
                const key = buildReminderKey(userId, bubble, reminder.minutesBefore);
                try {
                    if (!(await wasNotificationSent(key))) {
                        const url = `${HOMEPAGE_URL}/?bubbleId=${encodeURIComponent(String(bubble.id || ''))}`;
                        await sendFcmToUser(userId, {
                            data: {
                                bubbleId: String(bubble.id || ''),
                                type: 'reminder',
                                minutesBefore: String(reminder.minutesBefore),
                                url,
                                bubbleTitle: String(bubble.title || '')
                            }
                        });
                        await markNotificationSent(key);
                    }
                } catch (e) {
                    console.error('FCM reminder error', userId, bubble.id, e);
                }
                continue;
            }

            // 2) Overdue notification
            if (isBubbleOverdue(bubble)) {
                const key = buildOverdueKey(userId, bubble);
                try {
                    if (!(await wasNotificationSent(key))) {
                        const url = `${HOMEPAGE_URL}/?bubbleId=${encodeURIComponent(String(bubble.id || ''))}`;
                        await sendFcmToUser(userId, {
                            data: {
                                bubbleId: String(bubble.id || ''),
                                type: 'overdue',
                                url,
                                bubbleTitle: String(bubble.title || '')
                            }
                        });
                        await markNotificationSent(key);
                    }
                    // mark overdue in Firestore (sticky pulse across devices) - только если overdueSticky еще не установлен
                    if (!bubble.overdueSticky) {
                        await updateBubbleFields(userId, bubble.id, { overdueSticky: true, overdueAt: new Date().toISOString() });
                    }
                } catch (e) {
                    console.error('FCM overdue error', userId, bubble.id, e);
                }

                // Auto-reschedule dueDate if recurrence is configured
                try {
                    if (bubble.recurrence && bubble.dueDate) {
                        const nextDue = computeNextDueDate(new Date(bubble.dueDate), bubble.recurrence);
                        if (nextDue) {
                            await updateBubbleDueDate(userId, bubble.id, nextDue);
                            // keep sticky flag until user stops or dueDate manually changed/deleted - только если overdueSticky еще установлен
                            if (bubble.overdueSticky) {
                                await updateBubbleFields(userId, bubble.id, { overdueSticky: true });
                            }
                        }
                    }
                } catch (e) {
                    console.error('Reschedule error', userId, bubble.id, e);
                }
            }
        }
    }

    return null;
});


