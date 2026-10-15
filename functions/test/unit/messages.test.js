const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    INVALID_TOKEN_CODES, pickLanguage, pickRecipients, formatLead, notificationTexts, taskUrl, buildMessages,
} = require('../../lib/messages');

describe('pickLanguage', () => {
    it('uses uk only when settings say uk, en for anything else', () => {
        assert.equal(pickLanguage({ language: 'uk' }), 'uk');
        assert.equal(pickLanguage({ language: 'en' }), 'en');
        assert.equal(pickLanguage({ language: 'ru' }), 'en');
        assert.equal(pickLanguage(null), 'en');
    });
});

describe('pickRecipients', () => {
    it('takes devices with the switch on and a token', () => {
        const devices = [
            { id: 'phone', fcmToken: 'tok-phone', notificationsEnabled: true },
            { id: 'laptop', fcmToken: 'tok-laptop', notificationsEnabled: false },
            { id: 'tablet', fcmToken: null, notificationsEnabled: true },
            { id: 'old', fcmToken: '', notificationsEnabled: true },
        ];
        assert.deepEqual(pickRecipients(devices), [{ id: 'phone', token: 'tok-phone' }]);
    });
});

describe('formatLead', () => {
    it('shows hours, days and weeks in English', () => {
        assert.equal(formatLead(60, 'en'), '1 hour');
        assert.equal(formatLead(180, 'en'), '3 hours');
        assert.equal(formatLead(1440, 'en'), '1 day');
        assert.equal(formatLead(2880, 'en'), '2 days');
        assert.equal(formatLead(10080, 'en'), '1 week');
        assert.equal(formatLead(1500, 'en'), '25 hours');
    });

    it('uses Ukrainian plural forms after "за"', () => {
        assert.equal(formatLead(60, 'uk'), '1 годину');
        assert.equal(formatLead(120, 'uk'), '2 години');
        assert.equal(formatLead(300, 'uk'), '5 годин');
        assert.equal(formatLead(660, 'uk'), '11 годин');
        assert.equal(formatLead(1260, 'uk'), '21 годину');
        assert.equal(formatLead(4320, 'uk'), '3 дні');
        assert.equal(formatLead(7200, 'uk'), '5 днів');
        assert.equal(formatLead(524160, 'uk'), '52 тижні');
    });
});

describe('notificationTexts', () => {
    it('builds reminder and overdue texts with the task title', () => {
        assert.deepEqual(notificationTexts({ type: 'reminder', minutes: 1440, taskTitle: 'Pay bills', lang: 'en' }),
            { title: 'Task reminder', body: '1 day before: Pay bills' });
        assert.deepEqual(notificationTexts({ type: 'reminder', minutes: 60, taskTitle: 'Оплатити рахунки', lang: 'uk' }),
            { title: 'Нагадування про завдання', body: 'За 1 годину до строку: Оплатити рахунки' });
        assert.deepEqual(notificationTexts({ type: 'overdue', taskTitle: 'Pay bills', lang: 'uk' }),
            { title: 'Прострочене завдання!', body: 'Прострочено: Pay bills' });
    });

    it('names a blank title (spaces, no-break spaces) "Untitled"', () => {
        assert.equal(notificationTexts({ type: 'overdue', taskTitle: '\u00a0 ', lang: 'uk' }).body, 'Прострочено: Без назви');
        assert.equal(notificationTexts({ type: 'reminder', minutes: 60, taskTitle: '', lang: 'en' }).body, '1 hour before: Untitled');
    });

    it('cuts very long titles to 200 characters', () => {
        const { body } = notificationTexts({ type: 'overdue', taskTitle: '😀'.repeat(1000), lang: 'en' });
        assert.equal(Array.from(body).length, 'Overdue: '.length + 200 + 1);
        assert.equal(body.endsWith('…'), true);
    });
});

describe('buildMessages', () => {
    it('makes one message per token with data, android and webpush blocks', () => {
        const messages = buildMessages({ type: 'reminder', taskId: 't 1', taskTitle: 'Pay bills', minutes: 60, lang: 'en', tokens: ['a', 'b'] });
        assert.equal(messages.length, 2);
        assert.deepEqual(messages[0], {
            token: 'a',
            data: {
                type: 'reminder',
                taskId: 't 1',
                title: 'Task reminder',
                body: '1 hour before: Pay bills',
                url: 'https://pmobile78.github.io/to-round-react/?taskId=t%201',
                minutesBefore: '60',
            },
            android: { priority: 'high', ttl: 86400000 },
            webpush: { headers: { TTL: '86400', Urgency: 'high' }, fcmOptions: { link: 'https://pmobile78.github.io/to-round-react/?taskId=t%201' } },
        });
        assert.equal(messages[1].token, 'b');
    });

    it('has no minutesBefore in an overdue message', () => {
        const [message] = buildMessages({ type: 'overdue', taskId: 't1', taskTitle: 'Pay bills', lang: 'en', tokens: ['a'] });
        assert.equal('minutesBefore' in message.data, false);
        assert.equal(message.data.url, taskUrl('t1'));
    });

    it('treats only dead-token errors as invalid tokens', () => {
        assert.equal(INVALID_TOKEN_CODES.has('messaging/registration-token-not-registered'), true);
        assert.equal(INVALID_TOKEN_CODES.has('messaging/internal-error'), false);
    });
});
