import { describe, expect, it } from 'vitest';
import { getBubblesByStatus, isPlannedTask } from './bubbleStatus';

const NOW = Date.parse('2026-06-15T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const task = (id, status, dueAt = null) => ({ id, status, dueAt });

describe('isPlannedTask: an active task whose due is still ahead', () => {
    it('is planned while the due is ahead', () => {
        expect(isPlannedTask(task('a', 'active', NOW + HOUR), NOW)).toBe(true);
    });

    it('is not planned when the due has come, has passed or is missing', () => {
        expect(isPlannedTask(task('a', 'active', NOW), NOW)).toBe(false);
        expect(isPlannedTask(task('a', 'active', NOW - HOUR), NOW)).toBe(false);
        expect(isPlannedTask(task('a', 'active'), NOW)).toBe(false);
    });

    it('is not planned when done or deleted, even with a due ahead', () => {
        expect(isPlannedTask(task('a', 'done', NOW + HOUR), NOW)).toBe(false);
        expect(isPlannedTask(task('a', 'deleted', NOW + HOUR), NOW)).toBe(false);
    });
});

describe('getBubblesByStatus: the status tabs of the list', () => {
    const tasks = [
        task('active', 'active'),
        task('ahead', 'active', NOW + HOUR),
        task('passed', 'active', NOW - HOUR),
        task('done', 'done', NOW + HOUR),
        task('deleted', 'deleted'),
    ];
    const ids = (list) => list.map((t) => t.id);

    it('filters the "planned" tab by the due, not by a status', () => {
        expect(ids(getBubblesByStatus(tasks, 'postpone', NOW))).toEqual(['ahead']);
    });

    it('filters the other tabs by status', () => {
        expect(ids(getBubblesByStatus(tasks, 'active', NOW))).toEqual(['active', 'ahead', 'passed']);
        expect(ids(getBubblesByStatus(tasks, 'done', NOW))).toEqual(['done']);
        expect(ids(getBubblesByStatus(tasks, 'deleted', NOW))).toEqual(['deleted']);
    });
});
