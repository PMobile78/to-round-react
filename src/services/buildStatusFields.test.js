import { describe, it, expect, vi } from 'vitest';

vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
    doc: () => ({}),
    setDoc: () => {},
    updateDoc: () => {},
    deleteDoc: () => {},
    getDocs: () => {},
    collection: () => ({}),
    writeBatch: () => ({}),
    serverTimestamp: () => ({})
}));

import { buildStatusFields, BUBBLE_STATUS } from './firestoreService';

describe('buildStatusFields', () => {
    it('marks bubble as DONE: clears dueDate, notifications, recurrence, and overdue fields', () => {
        const bubble = {
            id: '1',
            status: 'active',
            dueDate: '2026-06-20',
            notifications: [{ time: '2026-06-20' }],
            recurrence: { freq: 'weekly' },
            overdueSticky: true,
            overdueAt: '2026-06-13',
            overduePulseSuppressed: true
        };

        const fields = buildStatusFields(bubble, BUBBLE_STATUS.DONE);

        expect(fields.status).toBe('done');
        expect(fields.updatedAt).toBeDefined();
        expect(fields.dueDate).toBe(null);
        expect(fields.notifications).toEqual([]);
        expect(fields.recurrence).toBe(null);
        expect(fields.overdueSticky).toBe(false);
        expect(fields.overdueAt).toBe(null);
        expect(fields.overduePulseSuppressed).toBe(false);
    });

    it('marks bubble as DELETED: sets deletedAt timestamp', () => {
        const bubble = {
            id: '2',
            status: 'active',
            deletedAt: null
        };

        const fields = buildStatusFields(bubble, BUBBLE_STATUS.DELETED);

        expect(fields.status).toBe('deleted');
        expect(fields.updatedAt).toBeDefined();
        expect(fields.deletedAt).toBeDefined();
        expect(typeof fields.deletedAt).toBe('string');
    });

    it('restores bubble from DELETED to ACTIVE: clears deletedAt', () => {
        const bubble = {
            id: '3',
            status: 'deleted',
            deletedAt: '2026-06-12'
        };

        const fields = buildStatusFields(bubble, BUBBLE_STATUS.ACTIVE);

        expect(fields.status).toBe('active');
        expect(fields.updatedAt).toBeDefined();
        expect(fields.deletedAt).toBe(null);
    });

    it('normal status transition: updates only status and updatedAt', () => {
        const bubble = {
            id: '4',
            status: 'active',
            dueDate: '2026-06-20',
            notifications: [{ time: '2026-06-20' }],
            recurrence: { freq: 'weekly' }
        };

        const fields = buildStatusFields(bubble, BUBBLE_STATUS.POSTPONE);

        expect(fields.status).toBe('postpone');
        expect(fields.updatedAt).toBeDefined();
        expect(fields.dueDate).toBeUndefined();
        expect(fields.notifications).toBeUndefined();
        expect(fields.recurrence).toBeUndefined();
    });

    it('restoring from DELETED but NOT to DONE: only clears deletedAt', () => {
        const bubble = {
            id: '5',
            status: 'deleted',
            deletedAt: '2026-06-12',
            dueDate: '2026-06-20'
        };

        const fields = buildStatusFields(bubble, BUBBLE_STATUS.POSTPONE);

        expect(fields.status).toBe('postpone');
        expect(fields.updatedAt).toBeDefined();
        expect(fields.deletedAt).toBe(null);
        expect(fields.dueDate).toBeUndefined();
        expect(fields.notifications).toBeUndefined();
    });
});
