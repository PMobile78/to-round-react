import { getBubblesByStatus } from '../services/firestoreService';
import { stripHtml } from '../utils/stripHtml';

// Pure helper: true when every tag is selected and "no tag" tasks are shown.
export function isAllListTagsSelected(tags, listFilterTags, listShowNoTag) {
    return tags.length > 0 && listFilterTags.length === tags.length && listShowNoTag;
}

// Pure helper: count tasks by tag for the list view (based on selected status and
// search). `tagId === null` counts tasks without a tag or with a deleted tag.
export function countBubblesByTagForListView({ bubbles, tags, listFilter, listSearchQuery }, tagId) {
    const filteredByStatus = getBubblesByStatus(bubbles, listFilter);
    let tagFilteredBubbles;

    if (tagId === null) {
        // Count bubbles without tags or with deleted tags in selected status
        tagFilteredBubbles = filteredByStatus.filter(bubble => {
            if (!bubble.tagId) return true;
            const tagExists = tags.find(t => t.id === bubble.tagId);
            return !tagExists; // Включаем пузыри с удаленными тегами
        });
    } else {
        tagFilteredBubbles = filteredByStatus.filter(bubble => bubble.tagId === tagId);
    }

    // Apply search filter using the same logic as in ListView
    if (!listSearchQuery || !listSearchQuery.trim()) {
        return tagFilteredBubbles.length;
    }

    const query = listSearchQuery.toLowerCase().trim();
    const searchFilteredBubbles = tagFilteredBubbles.filter(task => {
        // Search in title
        const titleMatch = (task.title || '').toLowerCase().includes(query);

        // Search in description
        const descriptionMatch = stripHtml(task.description || '').toLowerCase().includes(query);

        // Search in tag name
        const tag = task.tagId ? tags.find(t => t.id === task.tagId) : null;
        const tagMatch = tag ? tag.name.toLowerCase().includes(query) : false;

        return titleMatch || descriptionMatch || tagMatch;
    });

    return searchFilteredBubbles.length;
}
