const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { clearDeletedCategory, purgeDeletedTasks, cleanupNotificationSent } = require('../../lib/handlers');
const { db, clearFirestore, at, ts, task } = require('./helpers');

const NOW = at('2026-10-15T03:00:00.000Z');
const daysAgo = (n) => ts(new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString());

beforeEach(async () => {
    await clearFirestore();
});

describe('onCategoryDeleted', () => {
    it('leaves the tasks of the deleted category without a category, nothing else', async () => {
        await db.doc('users/alice/tasks/a').set(task({ categoryId: 'home' }));
        await db.doc('users/alice/tasks/b').set(task({ categoryId: 'work' }));
        await db.doc('users/bob/tasks/c').set(task({ categoryId: 'home' }));
        assert.equal(await clearDeletedCategory({ db, uid: 'alice', categoryId: 'home' }), 1);
        assert.equal((await db.doc('users/alice/tasks/a').get()).get('categoryId'), null);
        assert.equal((await db.doc('users/alice/tasks/b').get()).get('categoryId'), 'work');
        assert.equal((await db.doc('users/bob/tasks/c').get()).get('categoryId'), 'home');
    });

    it('keeps the tasks when a category with the same id exists again', async () => {
        await db.doc('users/alice/categories/home').set({ schemaVersion: 2, name: 'Home', color: '#da3833', order: 1 });
        await db.doc('users/alice/tasks/a').set(task({ categoryId: 'home' }));
        assert.equal(await clearDeletedCategory({ db, uid: 'alice', categoryId: 'home' }), 0);
        assert.equal((await db.doc('users/alice/tasks/a').get()).get('categoryId'), 'home');
    });
});

describe('purgeDeletedTasks', () => {
    it('removes tasks that stayed in the trash for more than 30 days', async () => {
        await db.doc('users/alice/tasks/old').set(task({ status: 'deleted', deletedAt: daysAgo(31) }));
        await db.doc('users/alice/tasks/recent').set(task({ status: 'deleted', deletedAt: daysAgo(29) }));
        await db.doc('users/alice/tasks/active').set(task());
        assert.equal(await purgeDeletedTasks({ db, now: NOW }), 1);
        assert.equal((await db.doc('users/alice/tasks/old').get()).exists, false);
        assert.equal((await db.doc('users/alice/tasks/recent').get()).exists, true);
        assert.equal((await db.doc('users/alice/tasks/active').get()).exists, true);
    });
});

describe('cleanupNotificationSent', () => {
    it('drops dedup keys older than 7 days', async () => {
        await db.doc('notification-sent/old').set({ sentAt: daysAgo(8) });
        await db.doc('notification-sent/fresh').set({ sentAt: daysAgo(6) });
        assert.equal(await cleanupNotificationSent({ db, now: NOW }), 1);
        assert.equal((await db.doc('notification-sent/old').get()).exists, false);
        assert.equal((await db.doc('notification-sent/fresh').get()).exists, true);
    });
});
