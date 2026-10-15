/**
 * Live sync of the canvas (#94, spec 8.3): task changes are applied to the bubbles list one by
 * one, without rebuilding it, and every task keeps exactly one Matter body.
 */
import { bubbleFromTask } from '../services/data/bubbleModel';

/**
 * prev: current bubbles; changes: [{ type: 'added' | 'modified' | 'removed', task }] from
 * subscribeTasks. initial: the first delivery of a subscription, which replaces the list.
 * createBubble(task) builds a bubble with a new body; removeBody(body) takes a body out of the
 * world. A task that already has a bubble (e.g. added on this device a moment earlier) keeps
 * its body; unchanged bubbles stay the same objects.
 */
export const applyTaskChanges = (prev, changes, { initial, createBubble, removeBody }) => {
    if (initial) {
        prev.forEach((bubble) => {
            if (bubble.body) removeBody(bubble.body);
        });
        return changes.filter((c) => c.type !== 'removed').map((c) => createBubble(c.task));
    }
    let next = prev;
    changes.forEach(({ type, task }) => {
        const index = next.findIndex((bubble) => bubble.id === task.id);
        if (type === 'removed') {
            if (index === -1) return;
            if (next[index].body) removeBody(next[index].body);
            next = next.filter((_, i) => i !== index);
        } else if (index === -1) {
            next = [...next, createBubble(task)];
        } else {
            const { body } = next[index];
            next = next.map((bubble, i) => (i === index ? { ...bubbleFromTask(task), body } : bubble));
        }
    });
    return next;
};
