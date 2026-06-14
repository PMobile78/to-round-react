/**
 * Pure tag-color helpers extracted from BubblesPage / useTags.
 * No React / Firestore / DOM — safe to unit-test directly.
 */

// My palette
export const COLOR_PALETTE = [
    '#da3833', '#ee603c', '#fd8b2b', '#e9be00', '#b7be00',
    '#7db44e', '#46a549', '#00a47a', '#34c09d', '#007771',
    '#00a5cf', '#0089b5', '#005ea4', '#6179cf', '#434d82',
    '#b14dd1', '#c04097', '#f25e6a', '#4d697e', '#86a49c'
];

export const getUsedColors = (tags) => {
    return (tags || []).map(tag => tag.color);
};

export const getAvailableColors = (tags, palette = COLOR_PALETTE) => {
    const usedColors = getUsedColors(tags);
    return palette.filter(color => !usedColors.includes(color));
};

export const getNextAvailableColor = (tags, palette = COLOR_PALETTE) => {
    const availableColors = getAvailableColors(tags, palette);
    return availableColors.length > 0 ? availableColors[0] : null;
};

export const isColorAvailable = (tags, color, editingTag = null) => {
    const usedColors = getUsedColors(tags);
    // Если редактируем тег, его текущий цвет всегда доступен
    if (editingTag && editingTag.color === color) {
        return true;
    }
    return !usedColors.includes(color);
};

export const canCreateMoreTags = (tags, palette = COLOR_PALETTE) => {
    return getAvailableColors(tags, palette).length > 0;
};
