/* eslint-disable no-console */
const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { isAfter, addMinutes, subMinutes, addHours, addDays, addWeeks, addMonths } = require('date-fns');
const { TZDate } = require('@date-fns/tz');

admin.initializeApp();
const db = admin.firestore();
const HOMEPAGE_URL = 'https://pmobile78.github.io/to-round-react';
const en = require('./locales/notifications.en.json');
const uk = require('./locales/notifications.uk.json');

// Data model notes:
// - NEW: User bubbles stored in subcollection `user-bubbles/{uid}/bubbles/{bubbleId}` (one doc per task)
// - LEGACY: Previously, user bubbles were stored in `user-bubbles/{uid}` with array field `bubbles`
// - FCM token stored in doc `user-fcm-tokens/{uid}` with field `token`

// Только задачи, которым уже пора (nextNotifyAt <= now), сгруппированные по пользователю.
async function fetchDueBubbles(now) {
    const grouped = new Map();
    const snap = await db.collectionGroup('bubbles')
        .where('status', '==', 'active')
        .where('nextNotifyAt', '<=', admin.firestore.Timestamp.fromDate(now))
        .orderBy('nextNotifyAt')
        .get();
    snap.forEach((d) => {
        const userId = d.ref.parent.parent?.id;
        if (!userId) return;
        const list = grouped.get(userId) || [];
        list.push(Object.assign({ id: d.id }, d.data() || {}));
        grouped.set(userId, list);
    });
    return Array.from(grouped.entries()).map(([userId, bubbles]) => ({ userId, bubbles }));
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

async function sendFcmToUser(userId, payload, tokens) {
    if (!tokens.length) return { skipped: true, reason: 'no-token' };

    const url = payload?.data?.url;
    const type = (payload?.data?.type || '').toString();
    const minutesBefore = Number(payload?.data?.minutesBefore);
    const bubbleTitle = payload?.data?.bubbleTitle || '';

    const results = [];
    for (const { id, token, language } of tokens) {
        try {
            const { title, body } = buildTextsPerLang(language, type, minutesBefore, bubbleTitle);
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
        const due = parseLocalDateTime(bubble.dueDate, bubble.tz) || new Date(bubble.dueDate);
        return isAfter(new Date(), due);
    } catch (_) {
        return false;
    }
}

// Функция для парсинга локального времени из строки
// tz — IANA-зона пользователя (bubble.tz). Если задана, строка без часового пояса
// интерпретируется в этой зоне; иначе — как локальное время сервера (legacy, UTC).
function parseLocalDateTime(dateString, tz) {
    if (!dateString) return null;
    try {
        // Если это ISO строка с Z или +/-, парсим как обычно
        if (dateString.includes('Z') || dateString.includes('+') || (dateString.match(/-/g) || []).length > 2) {
            return new Date(dateString);
        }
        // Иначе интерпретируем как локальное время (формат "YYYY-MM-DDTHH:mm:ss")
        const [datePart, timePart] = dateString.split('T');
        if (!datePart || !timePart) return new Date(dateString);

        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);

        if (tz) {
            // TZDate: instant корректен для зоны пользователя; арифметика date-fns
            // (addDays/addMonths) над TZDate остаётся календарно-корректной в этой зоне
            return new TZDate(year, month - 1, day, hours, minutes, seconds, tz);
        }
        // Legacy: Date объект в локальном времени сервера
        return new Date(year, month - 1, day, hours, minutes, seconds);
    } catch (_) {
        return null;
    }
}

// Функция для форматирования локального времени без конвертации в UTC
// Сохраняет время в формате "YYYY-MM-DDTHH:mm:ss" в зоне tz (или зоне сервера, если tz нет)
function formatLocalDateTime(date, tz) {
    if (!date) return null;
    try {
        let d = date instanceof Date ? date : new Date(date);
        if (!Number.isFinite(d.getTime())) return null;
        if (tz) d = new TZDate(d.getTime(), tz); // компоненты ниже — в зоне пользователя

        // Форматируем локальное время без конвертации в UTC
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    } catch (_) {
        return null;
    }
}

// Абсолютный момент (Date) ближайшего необработанного события задачи, строго после fromTime.
// Если будущих событий нет: для активной просроченной (overdue ещё не слался) или
// повторяющейся задачи — вернуть fromTime (немедленная обработка); иначе null.
function computeNextNotifyAt(bubble, fromTime) {
    if (!bubble || bubble.status !== 'active' || !bubble.dueDate) return null;
    const due = parseLocalDateTime(bubble.dueDate, bubble.tz) || new Date(bubble.dueDate);
    if (!due || !Number.isFinite(due.getTime())) return null;

    const fromMs = fromTime.getTime();
    const moments = [];
    // Collect all reminder moments; if no notifications array, only the overdue moment applies
    if (Array.isArray(bubble.notifications)) {
        for (const notif of bubble.notifications) {
            const mb = computeMinutesBefore(notif);
            if (Number.isFinite(mb)) {
                const m = subMinutes(due, mb);
                moments.push(new Date(m.getTime())); // normalize to plain Date
            }
        }
    }
    moments.push(new Date(due.getTime())); // overdue, normalized

    let next = null;
    for (const m of moments) {
        if (m.getTime() > fromMs && (next === null || m.getTime() < next.getTime())) next = m;
    }
    if (next) return next;

    // overdue and not yet marked sticky (overdue notification not sent yet)
    const overdueUnsent = isAfter(fromTime, due) && !bubble.overdueSticky;
    if (!bubble.overduePulseSuppressed && (overdueUnsent || bubble.recurrence)) return fromTime;
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

// Clean up notification-sent entries older than 7 days to prevent unbounded collection growth
async function cleanupOldNotificationSent() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const old = await db.collection('notification-sent')
        .where('sentAt', '<=', cutoff)
        .get();
    if (old.empty) return;
    const BATCH_SIZE = 500;
    const docsToDelete = old.docs;
    for (let i = 0; i < docsToDelete.length; i += BATCH_SIZE) {
        const chunk = docsToDelete.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        chunk.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
    }
    console.log(`Cleaned up ${old.size} old notification-sent entries`);
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

// Самый свежий reminder, чьё время наступило (reminderTime <= now) — или null.
function pickReminderToSend(bubble, now) {
    if (!bubble?.dueDate || !Array.isArray(bubble.notifications)) return null;
    const due = parseLocalDateTime(bubble.dueDate, bubble.tz) || new Date(bubble.dueDate);
    let best = null;
    for (const notif of bubble.notifications) {
        const mb = computeMinutesBefore(notif);
        if (!Number.isFinite(mb)) continue;
        const rt = subMinutes(due, mb);
        if (!isAfter(rt, now) && (!best || isAfter(rt, best.time))) {
            best = { time: rt, minutesBefore: mb };
        }
    }
    return best;
}

const SIGNIFICANT_FIELDS = ['dueDate', 'notifications', 'status', 'recurrence'];

// Менялись ли поля, влияющие на nextNotifyAt (гард от рекурсии триггера).
function significantChanged(before, after) {
    for (const f of SIGNIFICANT_FIELDS) {
        if (JSON.stringify(before?.[f]) !== JSON.stringify(after?.[f])) return true;
    }
    return false;
}

// Ближайшее вхождение строго в БУДУЩЕМ относительно now (пропускает «хвост» просрочки)
function computeNextFutureDueDate(currentDue, recurrence, now) {
    let nextDue = computeNextDueDate(currentDue, recurrence);
    let guard = 0;
    while (nextDue && nextDue.getTime() <= now.getTime() && guard < 100000) {
        const advanced = computeNextDueDate(nextDue, recurrence);
        if (!advanced || advanced.getTime() <= nextDue.getTime()) break; // нет прогресса — выходим
        nextDue = advanced;
        guard++;
    }
    return nextDue;
}

async function updateBubbleDueDate(userId, bubbleId, nextDue, tz) {
    // Форматируем время в локальном формате (в зоне пользователя) без UTC конвертации
    const formattedDueDate = formatLocalDateTime(nextDue, tz) || nextDue.toISOString();
    const subDoc = db.collection('user-bubbles').doc(userId).collection('bubbles').doc(String(bubbleId));
    const subSnap = await subDoc.get();
    if (subSnap.exists) {
        await subDoc.set({ dueDate: formattedDueDate, updatedAt: new Date().toISOString() }, { merge: true });
        await db.collection('user-bubbles').doc(userId).set({ updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return;
    }
    // Legacy fallback: array in parent doc
    const docRef = db.collection('user-bubbles').doc(userId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) return;
    const data = snapshot.data() || {};
    const list = Array.isArray(data.bubbles) ? data.bubbles : [];
    const updated = list.map(b => (b.id === bubbleId ? { ...b, dueDate: formattedDueDate, updatedAt: new Date().toISOString() } : b));
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

// Пересчитать и записать nextNotifyAt от актуального (локально обновлённого) состояния задачи.
async function updateNextNotifyAt(userId, bubbleId, bubble, now) {
    const next = computeNextNotifyAt(bubble, now);
    const subDoc = db.collection('user-bubbles').doc(userId).collection('bubbles').doc(String(bubbleId));
    await subDoc.set({
        nextNotifyAt: next
            ? admin.firestore.Timestamp.fromDate(next)
            : admin.firestore.FieldValue.delete()
    }, { merge: true });
}

async function handleReminder(userId, bubble, tokens, now) {
    const rem = pickReminderToSend(bubble, now);
    if (!rem) return;
    const key = buildReminderKey(userId, bubble, rem.minutesBefore);
    if (await wasNotificationSent(key)) return;
    const url = `${HOMEPAGE_URL}/?bubbleId=${encodeURIComponent(String(bubble.id || ''))}`;
    await sendFcmToUser(userId, {
        data: {
            bubbleId: String(bubble.id || ''),
            type: 'reminder',
            minutesBefore: String(rem.minutesBefore),
            url,
            bubbleTitle: String(bubble.title || '')
        }
    }, tokens);
    await markNotificationSent(key);
}

async function handleOverdue(userId, bubble, tokens, now) {
    // Пользователь остановил пульсацию: повторяющуюся задачу продвигаем на ближайшее будущее и молчим.
    if (bubble.overduePulseSuppressed) {
        if (bubble.recurrence && bubble.dueDate) {
            const currentDue = parseLocalDateTime(bubble.dueDate, bubble.tz) || new Date(bubble.dueDate);
            const nextDue = computeNextFutureDueDate(currentDue, bubble.recurrence, now);
            if (nextDue) {
                await updateBubbleDueDate(userId, bubble.id, nextDue, bubble.tz);
                await updateBubbleFields(userId, bubble.id, { overdueSticky: false, overdueAt: null, overduePulseSuppressed: false });
                bubble.dueDate = formatLocalDateTime(nextDue, bubble.tz) || bubble.dueDate;
                bubble.overdueSticky = false;
                bubble.overdueAt = null;
                bubble.overduePulseSuppressed = false;
            }
        }
        return;
    }

    const key = buildOverdueKey(userId, bubble);
    if (!(await wasNotificationSent(key))) {
        const url = `${HOMEPAGE_URL}/?bubbleId=${encodeURIComponent(String(bubble.id || ''))}`;
        await sendFcmToUser(userId, {
            data: { bubbleId: String(bubble.id || ''), type: 'overdue', url, bubbleTitle: String(bubble.title || '') }
        }, tokens);
        await markNotificationSent(key);
    }
    if (!bubble.overdueSticky) {
        await updateBubbleFields(userId, bubble.id, { overdueSticky: true, overdueAt: new Date().toISOString() });
        bubble.overdueSticky = true;
    }

    // Auto-reschedule повторяющейся задачи на ближайшее будущее вхождение.
    if (bubble.recurrence && bubble.dueDate) {
        const currentDue = parseLocalDateTime(bubble.dueDate, bubble.tz) || new Date(bubble.dueDate);
        const nextDue = computeNextFutureDueDate(currentDue, bubble.recurrence, now);
        if (nextDue) {
            await updateBubbleDueDate(userId, bubble.id, nextDue, bubble.tz);
            bubble.dueDate = formatLocalDateTime(nextDue, bubble.tz) || bubble.dueDate;
        }
    }
}

// Поддерживает nextNotifyAt при создании/редактировании задачи пользователем.
exports.maintainNextNotifyAt = onDocumentWritten({
    document: 'user-bubbles/{uid}/bubbles/{bubbleId}',
    region: 'europe-west1',
    maxInstances: 10
}, async (event) => {
    const after = event.data?.after;
    if (!after || !after.exists) return null; // удаление
    const afterData = after.data() || {};
    const before = event.data?.before?.exists ? event.data.before.data() : null;

    // Реагируем только на изменение значимых полей: наша же запись nextNotifyAt не зациклит триггер.
    if (before && !significantChanged(before, afterData)) return null;

    const next = computeNextNotifyAt(afterData, new Date());
    await after.ref.set({
        nextNotifyAt: next
            ? admin.firestore.Timestamp.fromDate(next)
            : admin.firestore.FieldValue.delete()
    }, { merge: true });
    return null;
});

exports.scheduleDueDateNotifications = onSchedule({
    schedule: 'every 1 minutes',
    region: 'europe-west1',
    maxInstances: 10
}, async () => {
    const now = new Date();

    if (now.getMinutes() === 0) {
        try { await cleanupOldNotificationSent(); }
        catch (e) { console.error('cleanupOldNotificationSent error', e); }
    }

    const users = await fetchDueBubbles(now);

    await Promise.all(users.map(async ({ userId, bubbles }) => {
        try {
            const tokens = await getUserFcmTokens(userId);
            for (const bubble of bubbles) {
                if (!bubble || bubble.status !== 'active') continue;
                try {
                    if (isBubbleOverdue(bubble)) {
                        await handleOverdue(userId, bubble, tokens, now);
                    } else {
                        await handleReminder(userId, bubble, tokens, now);
                    }
                } catch (e) {
                    console.error('Error processing bubble', userId, bubble.id, e);
                } finally {
                    // Сдвигаем nextNotifyAt всегда — иначе задача читалась бы каждую минуту.
                    await updateNextNotifyAt(userId, bubble.id, bubble, now);
                }
            }
        } catch (e) {
            console.error('Error processing user', userId, e);
        }
    }));

    return null;
});

// Exposed for local testing only (functions/test-tz.js)
exports._test = { parseLocalDateTime, formatLocalDateTime, computeNextDueDate, computeNextFutureDueDate, isBubbleOverdue, computeNextNotifyAt, pickReminderToSend, significantChanged };


