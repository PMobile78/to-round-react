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

// Pure: validate the backup envelope and map its records to the sanitized
// import shape. Invalid backups fail closed before any handler side effects.
export const parseImportData = (data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Backup payload must be an object');
    }
    if (data.version !== EXPORT_VERSION) {
        throw new Error('Unsupported backup version');
    }
    if (!Array.isArray(data.tags) || !Array.isArray(data.bubbles)) {
        throw new Error('Backup must contain bubbles and tags arrays');
    }

    const importedTags = data.tags.map(sanitizeTag);
    const importedBubbles = data.bubbles.map(sanitizeBubble);
    if (importedTags.some((tag) => !tag) || importedBubbles.some((bubble) => !bubble)) {
        throw new Error('Backup contains malformed records');
    }

    return { importedTags, importedBubbles };
};
