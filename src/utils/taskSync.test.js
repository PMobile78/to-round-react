import { describe, expect, it, vi } from 'vitest';
import { applyTaskChanges } from './taskSync';

const task = (id, overrides) => ({
    id,
    title: `Task ${id}`,
    description: '',
    categoryId: null,
    status: 'active',
    due: null,
    reminders: [],
    repeat: null,
    radius: 45,
    pulseMuted: false,
    createdAt: '2026-10-15T09:00:00.000Z',
    updatedAt: '2026-10-15T09:00:00.000Z',
    deletedAt: null,
    ...overrides,
});

const setup = () => {
    let bodyId = 0;
    const createBubble = vi.fn((t) => ({ ...t, tagId: t.categoryId, body: { id: (bodyId += 1) } }));
    const removeBody = vi.fn();
    const apply = (prev, changes, initial = false) => applyTaskChanges(prev, changes, { initial, createBubble, removeBody });
    return { createBubble, removeBody, apply };
};

describe('applyTaskChanges (#94, spec 8.3)', () => {
    it('builds one bubble per task on the first delivery and drops the bodies it replaces', () => {
        const { apply, removeBody } = setup();
        const old = { ...task('x'), body: { id: 99 } };
        const next = apply([old], [{ type: 'added', task: task('a') }, { type: 'added', task: task('b') }], true);
        expect(next.map((b) => [b.id, b.body.id])).toEqual([['a', 1], ['b', 2]]);
        expect(removeBody).toHaveBeenCalledWith(old.body);
    });

    it('appends a task added on another device with a new body', () => {
        const { apply } = setup();
        const a = apply([], [{ type: 'added', task: task('a') }], true);
        const next = apply(a, [{ type: 'added', task: task('b', { title: 'From the phone' }) }]);
        expect(next.map((b) => b.id)).toEqual(['a', 'b']);
        expect(next[1]).toMatchObject({ title: 'From the phone', body: { id: 2 } });
    });

    it('keeps the body of a bubble that is already there, e.g. added on this device a moment ago', () => {
        const { apply, createBubble } = setup();
        const local = { ...task('a'), tagId: null, body: { id: 50 } };
        const next = apply([local], [{ type: 'added', task: task('a', { title: 'Confirmed' }) }]);
        expect(next).toHaveLength(1);
        expect(next[0]).toMatchObject({ title: 'Confirmed', body: { id: 50 } });
        expect(createBubble).not.toHaveBeenCalled();
    });

    it('replaces only the changed bubble and leaves the others as they were', () => {
        const { apply } = setup();
        const prev = apply([], [{ type: 'added', task: task('a') }, { type: 'added', task: task('b') }], true);
        const next = apply(prev, [{ type: 'modified', task: task('b', { categoryId: 'c1', radius: 60 }) }]);
        expect(next[0]).toBe(prev[0]);
        expect(next[1]).toMatchObject({ categoryId: 'c1', tagId: 'c1', radius: 60, body: prev[1].body });
    });

    it('removes a task deleted on another device together with its body', () => {
        const { apply, removeBody } = setup();
        const prev = apply([], [{ type: 'added', task: task('a') }, { type: 'added', task: task('b') }], true);
        const next = apply(prev, [{ type: 'removed', task: task('a') }]);
        expect(next.map((b) => b.id)).toEqual(['b']);
        expect(removeBody).toHaveBeenCalledWith(prev[0].body);
    });

    it('ignores the removal of a task it does not have', () => {
        const { apply, removeBody } = setup();
        const prev = apply([], [{ type: 'added', task: task('a') }], true);
        expect(apply(prev, [{ type: 'removed', task: task('zz') }])).toEqual(prev);
        expect(removeBody).not.toHaveBeenCalled();
    });
});
