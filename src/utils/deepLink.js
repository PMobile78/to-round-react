/**
 * The task a notification link opens: ?taskId=<id> (data contract v2, spec 4.4) or the old
 * ?bubbleId=<id>. search is window.location.search.
 */
export const deepLinkTaskId = (search) => {
    const params = new URLSearchParams(search);
    return params.get('taskId') || params.get('bubbleId') || null;
};
