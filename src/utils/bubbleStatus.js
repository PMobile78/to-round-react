// Task statuses as the UI uses them. v2 stores active, done and deleted (spec 3.1);
// POSTPONE stays for the list's "planned" tab, which filters by due, not by status.
export const BUBBLE_STATUS = {
    ACTIVE: 'active',
    DONE: 'done',
    POSTPONE: 'postpone',
    DELETED: 'deleted'
};

// Get bubbles by status
export const getBubblesByStatus = (bubblesData, status) => {
    if (!status) return bubblesData;
    return bubblesData.filter(bubble => bubble.status === status);
};
