import { describe, expect, it } from 'vitest';
import { deepLinkTaskId } from './deepLink';

describe('deepLinkTaskId (spec 4.4)', () => {
    it('reads the task of a v2 notification link', () => {
        expect(deepLinkTaskId('?taskId=t1')).toBe('t1');
    });

    it('still opens the old ?bubbleId= links', () => {
        expect(deepLinkTaskId('?bubbleId=b1')).toBe('b1');
    });

    it('prefers taskId when a link has both', () => {
        expect(deepLinkTaskId('?bubbleId=b1&taskId=t1')).toBe('t1');
    });

    it('returns null for a link without a task', () => {
        expect(deepLinkTaskId('')).toBeNull();
        expect(deepLinkTaskId('?taskId=')).toBeNull();
    });
});
