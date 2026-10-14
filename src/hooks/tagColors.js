/**
 * Pure tag-color helpers extracted from BubblesPage / useTags.
 * No React / Firestore / DOM — safe to unit-test directly.
 */

import { PALETTE } from '../contract/schema';

// Category palette is shared with the Android app: contract/palette.json.
export const COLOR_PALETTE = PALETTE;

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
