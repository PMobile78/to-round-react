/**
 * Push messages for v2 notifications (spec 4.4): recipients, language, texts and the FCM payload
 * with `data`, `android` and `webpush` blocks. Pure functions; sending lives in handlers.js.
 */
const en = require('../locales/notifications.en.json');
const uk = require('../locales/notifications.uk.json');

const DICTS = { en, uk };
const HOMEPAGE_URL = 'https://pmobile78.github.io/to-round-react/';
const TTL_SECONDS = 24 * 60 * 60;
const TITLE_MAX = 200;
const HOUR = 60;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** FCM errors that mean the token is dead: the device gets fcmToken = null. */
const INVALID_TOKEN_CODES = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
]);

/** Notification language: settings.language when it is "uk", otherwise "en" (spec 4.4). */
const pickLanguage = (settings) => (settings && settings.language === 'uk' ? 'uk' : 'en');

/** Devices that get notifications: switch on and a token present. */
function pickRecipients(devices) {
    return devices
        .filter((d) => d.notificationsEnabled === true && typeof d.fcmToken === 'string' && d.fcmToken.length > 0)
        .map((d) => ({ id: d.id, token: d.fcmToken }));
}

const fill = (template, vars) => String(template).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));

/** "1 hour", "2 дні", "3 weeks": reminders are whole hours, shown in the largest whole unit. */
function formatLead(minutes, lang) {
    const dict = DICTS[lang] || en;
    let unit = 'hour';
    let n = minutes / HOUR;
    if (minutes % WEEK === 0) {
        unit = 'week';
        n = minutes / WEEK;
    } else if (minutes % DAY === 0) {
        unit = 'day';
        n = minutes / DAY;
    }
    const forms = dict.units[unit];
    return fill(forms[new Intl.PluralRules(lang).select(n)] || forms.other, { n });
}

// Long titles are cut so the payload stays far below FCM's 4 KB limit.
function shortTitle(title) {
    const chars = Array.from(String(title || ''));
    return chars.length > TITLE_MAX ? `${chars.slice(0, TITLE_MAX).join('')}…` : chars.join('');
}

/** Localized notification title and body; a blank task title reads "Untitled" / "Без назви". */
function notificationTexts({ type, minutes, taskTitle, lang }) {
    const dict = DICTS[lang] || en;
    const title = String(taskTitle || '').trim() ? shortTitle(taskTitle) : dict.untitled;
    if (type === 'reminder') {
        return { title: dict.reminder.title, body: fill(dict.reminder.body, { lead: formatLead(minutes, lang), title }) };
    }
    return { title: dict.overdue.title, body: fill(dict.overdue.body, { title }) };
}

/** Link that opens the task in the web app. */
const taskUrl = (taskId) => `${HOMEPAGE_URL}?taskId=${encodeURIComponent(taskId)}`;

/** One FCM message per token (spec 4.4: data, android high priority, webpush urgency; TTL one day). */
function buildMessages({ type, taskId, taskTitle, minutes, lang, tokens }) {
    const { title, body } = notificationTexts({ type, minutes, taskTitle, lang });
    const url = taskUrl(taskId);
    const data = { type, taskId: String(taskId), title, body, url };
    if (type === 'reminder') data.minutesBefore = String(minutes);
    return tokens.map((token) => ({
        token,
        data,
        android: { priority: 'high', ttl: TTL_SECONDS * 1000 },
        webpush: { headers: { TTL: String(TTL_SECONDS), Urgency: 'high' }, fcmOptions: { link: url } },
    }));
}

module.exports = {
    INVALID_TOKEN_CODES,
    pickLanguage,
    pickRecipients,
    formatLead,
    notificationTexts,
    taskUrl,
    buildMessages,
};
