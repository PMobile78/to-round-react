const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { processTask, runScheduler } = require('../../lib/handlers');
const { db, clearFirestore, fakeMessaging, at, ts, DUE, task, seedAlice } = require('./helpers');

const REMINDER_60 = '2026-10-15T09:00:00.000Z';

beforeEach(async () => {
    await clearFirestore();
    await seedAlice();
});

describe('scheduleNotifications', () => {
    it('sends the due reminder once, in the user language, only to enabled devices with a token', async () => {
        await db.doc('users/alice/tasks/t1').set(task({ nextNotifyAt: ts(REMINDER_60) }));
        const messaging = fakeMessaging();
        await runScheduler({ db, messaging, now: at(REMINDER_60) + 30000 });

        assert.deepEqual(messaging.sent.map((m) => m.token), ['tok-phone']);
        assert.deepEqual(messaging.sent[0].data, {
            type: 'reminder',
            taskId: 't1',
            title: 'Нагадування про завдання',
            body: 'За 1 годину до строку: Buy milk',
            url: 'https://pmobile78.github.io/to-round-react/?taskId=t1',
            minutesBefore: '60',
        });
        const after = (await db.doc('users/alice/tasks/t1').get()).data();
        assert.equal(after.nextNotifyAt.toMillis(), at(DUE));
        const key = await db.doc('notification-sent/reminder:alice:t1:60:2026-10-15T12:00@Europe%2FBerlin').get();
        assert.equal(key.exists, true);
    });

    it('never sends the same reminder twice', async () => {
        await db.doc('users/alice/tasks/t1').set(task({ nextNotifyAt: ts(REMINDER_60) }));
        const messaging = fakeMessaging();
        await runScheduler({ db, messaging, now: at(REMINDER_60) + 30000 });
        await db.doc('users/alice/tasks/t1').update({ nextNotifyAt: ts(REMINDER_60) });
        await runScheduler({ db, messaging, now: at(REMINDER_60) + 40000 });
        assert.equal(messaging.sent.length, 1);
    });

    it('notifies overdue once and marks the task when the due moment passes', async () => {
        await db.doc('users/alice/tasks/t1').set(task({ nextNotifyAt: ts(DUE), repeat: { every: 1, unit: 'days' } }));
        const messaging = fakeMessaging();
        const now = at(DUE) + 20000;
        await runScheduler({ db, messaging, now });

        assert.equal(messaging.sent.length, 1);
        assert.equal(messaging.sent[0].data.type, 'overdue');
        assert.equal(messaging.sent[0].data.body, 'Прострочено: Buy milk');
        const after = (await db.doc('users/alice/tasks/t1').get()).data();
        assert.equal(after.overdueAt.toMillis(), now);
        assert.equal('nextNotifyAt' in after, false);
        assert.deepEqual(after.due, task().due); // the server never moves the due of a repeating task
    });

    it('sends overdue, not a stale reminder, after a late run', async () => {
        await db.doc('users/alice/tasks/t1').set(task({ nextNotifyAt: ts(REMINDER_60) }));
        const messaging = fakeMessaging();
        await runScheduler({ db, messaging, now: at(DUE) + 5 * 60000 });
        assert.deepEqual(messaging.sent.map((m) => m.data.type), ['overdue']);
    });

    it('clears the token of a device FCM no longer knows, keeps it on other errors', async () => {
        await db.doc('users/alice/devices/watch').set({ platform: 'android', fcmToken: 'tok-watch', notificationsEnabled: true });
        await db.doc('users/alice/tasks/t1').set(task({ nextNotifyAt: ts(REMINDER_60) }));
        const messaging = fakeMessaging({
            'tok-phone': 'messaging/registration-token-not-registered',
            'tok-watch': 'messaging/internal-error',
        });
        await runScheduler({ db, messaging, now: at(REMINDER_60) + 30000 });
        assert.equal((await db.doc('users/alice/devices/phone').get()).get('fcmToken'), null);
        assert.equal((await db.doc('users/alice/devices/watch').get()).get('fcmToken'), 'tok-watch');
    });

    it('keeps a token the device replaced while the send to the old one was failing', async () => {
        await db.doc('users/alice/tasks/t1').set(task({ nextNotifyAt: ts(REMINDER_60) }));
        const messaging = fakeMessaging({ 'tok-phone': 'messaging/registration-token-not-registered' },
            () => db.doc('users/alice/devices/phone').update({ fcmToken: 'tok-phone-new' }));
        await runScheduler({ db, messaging, now: at(REMINDER_60) + 30000 });
        assert.equal((await db.doc('users/alice/devices/phone').get()).get('fcmToken'), 'tok-phone-new');
    });

    it('ignores "tasks" collections outside users/{uid}', async () => {
        await db.doc('user-mindmaps/bob/maps/m1/tasks/x').set(task({ nextNotifyAt: ts(REMINDER_60) }));
        await db.doc('users/bob/devices/phone').set({ platform: 'android', fcmToken: 'tok-bob', notificationsEnabled: true });
        const messaging = fakeMessaging();
        const result = await runScheduler({ db, messaging, now: at(REMINDER_60) + 30000 });
        assert.equal(result.tasks, 0);
        assert.equal(messaging.sent.length, 0);
    });

    it('ignores a users/{uid}/tasks path nested under another collection', async () => {
        await db.doc('user-mindmaps/bob/users/alice/tasks/x').set(task({ title: 'PHISH from bob', nextNotifyAt: ts(REMINDER_60) }));
        const messaging = fakeMessaging();
        const result = await runScheduler({ db, messaging, now: at(REMINDER_60) + 30000 });
        assert.equal(result.tasks, 0);
        assert.equal(messaging.sent.length, 0);
    });

    it('does not overwrite server fields when the user changed the schedule during the pass', async () => {
        const ref = db.doc('users/alice/tasks/t1');
        await ref.set(task({ nextNotifyAt: ts(REMINDER_60) }));
        const stale = await ref.get();
        await ref.update({ due: { local: '2026-10-20T12:00', tz: 'Europe/Berlin' }, nextNotifyAt: ts('2026-10-19T10:00:00.000Z') });
        const recipients = [{ id: 'phone', token: 'tok-phone' }];
        await processTask({ db, messaging: fakeMessaging(), uid: 'alice', snap: stale, lang: 'uk', recipients, now: at(REMINDER_60) + 30000 });
        assert.equal((await ref.get()).get('nextNotifyAt').toMillis(), at('2026-10-19T10:00:00.000Z'));
    });
});

describe('scheduleNotifications: undelivered notifications (issue #93)', () => {
    const KEY = 'notification-sent/reminder:alice:t1:60:2026-10-15T12:00@Europe%2FBerlin';
    const ref = () => db.doc('users/alice/tasks/t1');

    it('without recipients claims nothing and retries until a device can take it', async () => {
        await db.doc('users/alice/devices/phone').update({ notificationsEnabled: false });
        await ref().set(task({ nextNotifyAt: ts(REMINDER_60) }));
        await runScheduler({ db, messaging: fakeMessaging(), now: at(REMINDER_60) + 10000 });
        assert.equal((await db.doc(KEY).get()).exists, false);
        assert.equal((await ref().get()).get('nextNotifyAt').toMillis(), at(REMINDER_60));

        await db.doc('users/alice/devices/phone').update({ notificationsEnabled: true });
        const messaging = fakeMessaging();
        await runScheduler({ db, messaging, now: at(REMINDER_60) + 70000 });
        assert.equal(messaging.sent.length, 1);
        assert.equal((await ref().get()).get('nextNotifyAt').toMillis(), at(DUE));
    });

    it('frees the key when every send failed and sends exactly once on a later pass', async () => {
        await ref().set(task({ nextNotifyAt: ts(REMINDER_60) }));
        await runScheduler({ db, messaging: fakeMessaging({ 'tok-phone': 'messaging/internal-error' }), now: at(REMINDER_60) + 10000 });
        assert.equal((await db.doc(KEY).get()).exists, false);
        const messaging = fakeMessaging();
        await runScheduler({ db, messaging, now: at(REMINDER_60) + 70000 });
        await runScheduler({ db, messaging, now: at(REMINDER_60) + 130000 });
        assert.equal(messaging.sent.length, 1);
    });

    it('gives up 10 minutes after the event moment', async () => {
        await ref().set(task({ nextNotifyAt: ts(REMINDER_60) }));
        await runScheduler({ db, messaging: fakeMessaging({ 'tok-phone': 'messaging/internal-error' }), now: at(REMINDER_60) + 11 * 60000 });
        assert.equal((await ref().get()).get('nextNotifyAt').toMillis(), at(DUE));
    });

    it('counts a notification that reached at least one device as delivered', async () => {
        await db.doc('users/alice/devices/watch').set({ platform: 'android', fcmToken: 'tok-watch', notificationsEnabled: true });
        await ref().set(task({ nextNotifyAt: ts(REMINDER_60) }));
        await runScheduler({ db, messaging: fakeMessaging({ 'tok-watch': 'messaging/internal-error' }), now: at(REMINDER_60) + 10000 });
        assert.equal((await db.doc(KEY).get()).exists, true);
        assert.equal((await ref().get()).get('nextNotifyAt').toMillis(), at(DUE));
    });

    it('sends once when two passes overlap', async () => {
        await ref().set(task({ nextNotifyAt: ts(REMINDER_60) }));
        const messaging = fakeMessaging();
        await Promise.all([
            runScheduler({ db, messaging, now: at(REMINDER_60) + 10000 }),
            runScheduler({ db, messaging, now: at(REMINDER_60) + 10000 }),
        ]);
        assert.equal(messaging.sent.length, 1);
    });

    it('keeps retrying when an overlapping pass met the key while the send was failing', async () => {
        await ref().set(task({ nextNotifyAt: ts(REMINDER_60) }));
        const now = at(REMINDER_60) + 10000;
        const overlapping = fakeMessaging();
        const failing = fakeMessaging({ 'tok-phone': 'messaging/internal-error' },
            () => runScheduler({ db, messaging: overlapping, now }));
        await runScheduler({ db, messaging: failing, now });
        assert.equal((await ref().get()).get('nextNotifyAt').toMillis(), at(REMINDER_60));

        const messaging = fakeMessaging();
        await runScheduler({ db, messaging, now: now + 60000 });
        assert.equal(overlapping.sent.length + messaging.sent.length, 1);
    });

    it('takes over a key left pending by a pass that died mid-send', async () => {
        await ref().set(task({ nextNotifyAt: ts(REMINDER_60) }));
        // A pass claimed the reminder at its moment and died before sending or freeing the key.
        await db.doc(KEY).set({ sentAt: ts(REMINDER_60), state: 'pending' });

        const early = fakeMessaging();
        await runScheduler({ db, messaging: early, now: at(REMINDER_60) + 60000 }); // the claimer may still be alive
        assert.equal(early.sent.length, 0);
        assert.equal((await ref().get()).get('nextNotifyAt').toMillis(), at(REMINDER_60));

        const messaging = fakeMessaging();
        await runScheduler({ db, messaging, now: at(REMINDER_60) + 3 * 60000 });
        assert.deepEqual(messaging.sent.map((m) => m.token), ['tok-phone']);
        assert.equal((await db.doc(KEY).get()).get('state'), 'sent');
        assert.equal((await ref().get()).get('nextNotifyAt').toMillis(), at(DUE));
    });

    it('drops the event instead of taking over a pending key after the retry window', async () => {
        await ref().set(task({ nextNotifyAt: ts(DUE) }));
        await db.doc('notification-sent/overdue:alice:t1:2026-10-15T12:00@Europe%2FBerlin').set({ sentAt: ts(DUE), state: 'pending' });
        const messaging = fakeMessaging();
        const now = at(DUE) + 11 * 60000;
        await runScheduler({ db, messaging, now });
        assert.equal(messaging.sent.length, 0);
        const after = (await ref().get()).data();
        assert.equal(after.overdueAt.toMillis(), now);
        assert.equal('nextNotifyAt' in after, false);
    });
});
