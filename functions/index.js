/* eslint-disable no-console */
const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { isAfter, addMinutes, subMinutes } = require('date-fns');

admin.initializeApp();
const db = admin.firestore();
const HOMEPAGE_URL = 'https://pmobile78.github.io/to-round-react';
const en = require('./locales/notifications.en.json');
const uk = require('./locales/notifications.uk.json');

// Data model notes:
// - User bubbles stored in doc `user-bubbles/{uid}` with array field `bubbles`
// - FCM token stored in doc `user-fcm-tokens/{uid}` with field `token`

async function fetchAllUserBubbles() {
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
                const title = 'Напоминание о задаче';
                const body = bubble.title ? `${reminder.minutesBefore} мин до срока: ${bubble.title}` : `${reminder.minutesBefore} мин до срока`;
                const key = buildReminderKey(userId, bubble, reminder.minutesBefore);
                try {
                    if (!(await wasNotificationSent(key))) {
                        const url = `${HOMEPAGE_URL}/?bubbleId=${encodeURIComponent(String(bubble.id || ''))}`;
                        await sendFcmToUser(userId, {
                            notification: { title, body },
                            data: { bubbleId: String(bubble.id || ''), type: 'reminder', minutesBefore: String(reminder.minutesBefore), url }
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
                const title = 'Просроченная задача!';
                const body = bubble.title ? `Просрочено: ${bubble.title}` : 'У вас есть просроченная задача';
                const key = buildOverdueKey(userId, bubble);
                try {
                    if (!(await wasNotificationSent(key))) {
                        const url = `${HOMEPAGE_URL}/?bubbleId=${encodeURIComponent(String(bubble.id || ''))}`;
                        await sendFcmToUser(userId, {
                            notification: { title, body },
                            data: { bubbleId: String(bubble.id || ''), type: 'overdue', url }
                        });
                        await markNotificationSent(key);
                    }
                } catch (e) {
                    console.error('FCM overdue error', userId, bubble.id, e);
                }
            }
        }
    }

    return null;
});


