/**
 * Pure visibility selector + search-render helper extracted from BubblesPage
 * (Task E of #69 / #64). No Matter.js / DOM / React side effects — those live in
 * the useBubbleWorld hook. These functions decide *which* bubbles belong in the
 * physics world and *how* a bubble should be styled for the current search state.
 */
import { BUBBLE_STATUS } from '../services/firestoreService';

const NO_TAG_GREY = '#B0B0B0';

/**
 * Pure helper: true when every tag is selected and "no tag" bubbles are shown.
 */
export function isAllTagsSelected(tags, filterTags, showNoTag) {
    return tags.length > 0 && filterTags.length === tags.length && showNoTag;
}

/**
 * Pure helper: count active (or search-found) bubbles for a tag in bubbles-view.
 * Always reflects the total count for the tag, independent of the active filters,
 * but honours the current search query when one is present. `tagId === null`
 * counts bubbles without a tag (or whose tag was deleted).
 */
export function countBubblesByTagForBubblesView({ bubbles, tags, searchFoundBubbles, debouncedSearchQuery }, tagId) {
    const bubblesForCount = debouncedSearchQuery && debouncedSearchQuery.trim()
        ? searchFoundBubbles
        : bubbles.filter((bubble) => bubble.status === BUBBLE_STATUS.ACTIVE);

    if (tagId === null) {
        return bubblesForCount.filter((bubble) => {
            if (!bubble.tagId) return true;
            const tagExists = tags.find((t) => t.id === bubble.tagId);
            return !tagExists; // include bubbles whose tag was deleted
        }).length;
    }
    return bubblesForCount.filter((bubble) => bubble.tagId === tagId).length;
}

/**
 * Pure: the set of bubbles that must be present in the physics world.
 * Mirrors the original `getFilteredBubbles` memo exactly:
 *   - only ACTIVE bubbles,
 *   - "all tags selected + showNoTag" short-circuits to every active bubble,
 *   - otherwise keep bubbles whose (existing) tag is selected, plus — when
 *     showNoTag is on — untagged bubbles and bubbles whose tag was deleted,
 *   - in planned-tasks mode, additionally keep only future-due, non-done,
 *     non-deleted bubbles.
 *
 * `now` is injectable so the planned-tasks branch is deterministically testable.
 */
export const selectVisibleBubbles = (
    { bubbles, tags, filterTags, showNoTag, bubbleViewPlannedTasksOnly },
    now = new Date()
) => {
    // Always show only active bubbles in physics world
    const filteredByStatus = bubbles.filter(bubble => bubble.status === BUBBLE_STATUS.ACTIVE);

    // Apply tag filters
    // Check if all tags are selected and showNoTag is true - show all bubbles
    const allTagsSelected = tags.length > 0 && filterTags.length === tags.length && showNoTag;

    let tagFiltered;
    if (allTagsSelected) {
        tagFiltered = filteredByStatus;
    } else {
        tagFiltered = filteredByStatus.filter(bubble => {
            // Проверяем, существует ли тег для пузыря
            const tagExists = bubble.tagId ? tags.find(t => t.id === bubble.tagId) : null;

            // Если выбраны теги и пузырь имеет один из выбранных тегов (который существует)
            if (filterTags.length > 0 && bubble.tagId && tagExists && filterTags.includes(bubble.tagId)) {
                return true;
            }
            // Если включен фильтр "No Tag" и у пузыря нет тега или тег был удален
            if (showNoTag && (!bubble.tagId || !tagExists)) {
                return true;
            }
            return false;
        });
    }

    if (!bubbleViewPlannedTasksOnly) {
        return tagFiltered;
    }

    // Как в TaskList для вкладки «Запланированные»: dueDate строго в будущем, не выполнены и не удалены
    return tagFiltered.filter((bubble) => (
        bubble.dueDate &&
        new Date(bubble.dueDate) > now &&
        bubble.status !== BUBBLE_STATUS.DELETED &&
        bubble.status !== BUBBLE_STATUS.DONE
    ));
};

/**
 * Pure: the `body.render` properties to apply for a bubble given the current
 * search state. Extracted verbatim from the (previously duplicated) styling block
 * in the visibility effect. `tagColor` is the resolved tag colour (or null for
 * untagged / deleted-tag bubbles).
 */
export const computeBubbleSearchRender = ({ tagColor, isFound, hasSearchQuery, theme }) => {
    const opacity = hasSearchQuery ? (isFound ? 1 : 0.3) : 1;

    if (hasSearchQuery && isFound) {
        const highlightColor = tagColor || NO_TAG_GREY;
        return {
            opacity,
            strokeStyle: highlightColor,
            lineWidth: theme.custom?.bubble?.highlightStrokeWidth ?? 2.5,
            // Свечение цветом тега
            shadowColor: highlightColor,
            shadowBlur: 15,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
        };
    }

    const originalStrokeColor = tagColor || NO_TAG_GREY;
    return {
        opacity,
        strokeStyle: originalStrokeColor,
        lineWidth: theme.custom?.bubble?.strokeWidth ?? 1.5,
        // Без свечения
        shadowColor: 'transparent',
        shadowBlur: 0,
    };
};
