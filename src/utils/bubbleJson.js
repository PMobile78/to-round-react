/**
 * Pure JSON import/export helpers extracted from BubblesPage (Task D of #68).
 * No Firestore / DOM / React state side effects — those stay in the
 * useBubbleImportExport hook. The sanitizers come from ./bubbleData.
 */
import { sanitizeBubble, sanitizeTag, sanitizeBubblesForExport } from './bubbleData';

// Current export schema version (was the inline `version: 1` in handleExportJson).
export const EXPORT_VERSION = 1;

// Pure: timestamped export filename for a given date (defaults to now).
export const buildExportFilename = (date = new Date()) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `todo-round-export-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.json`;
};

// Pure: build the export payload object from current bubbles + tags. Bubbles are
// run through sanitizeBubblesForExport; tags are exported as-is (raw), matching
// the original handler.
export const buildExportData = ({ bubbles, tags }, date = new Date()) => ({
    version: EXPORT_VERSION,
    exportedAt: date.toISOString(),
    bubbles: sanitizeBubblesForExport(bubbles),
    tags
});

// Pure: map raw imported `data` -> { importedTags, importedBubbles }, dropping
// anything that fails sanitization.
export const parseImportData = (data) => {
    const importedTags = Array.isArray(data?.tags)
        ? data.tags.map(sanitizeTag).filter(Boolean)
        : [];
    const importedBubbles = Array.isArray(data?.bubbles)
        ? data.bubbles.map(sanitizeBubble).filter(Boolean)
        : [];
    return { importedTags, importedBubbles };
};
