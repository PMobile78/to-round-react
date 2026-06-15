import { useCallback } from 'react';
import { saveBubblesToFirestore, saveTagsToFirestore } from '../services/firestoreService';
import { exportJsonFile } from '../utils/exportJson';
import logger from '../utils/logger';
import { buildExportData, buildExportFilename, parseImportData } from '../utils/bubbleJson';

/**
 * JSON import/export handlers extracted from BubblesPage (Task D of #68 / #64).
 *
 * The pure payload-building / parsing lives in ../utils/bubbleJson (unit-tested);
 * this hook keeps only the thin side effects — file download, Firestore writes,
 * state setters and the page reload.
 *
 * `bubbles` and `tags` are read at call-time from the pageDeps bridge ref (they
 * are page-owned state); `setBubbles` / `setTags` are passed in. This mirrors the
 * ref-bridge technique used by useBubbleFilters / useListFilters.
 */
export function useBubbleImportExport({ pageDeps, setBubbles, setTags }) {
    // Export current data to JSON. Reads bubbles + tags from the pageDeps bridge at
    // call-time; consumers of this callback are not memoized, so a stable identity
    // here is safe.
    const handleExportJson = useCallback(() => {
        const deps = (pageDeps && pageDeps.current) || {};
        const now = new Date();
        const data = buildExportData({ bubbles: deps.bubbles || [], tags: deps.tags || [] }, now);
        const filename = buildExportFilename(now);
        exportJsonFile(data, filename);
    }, [pageDeps]);

    // Import data from JSON (replace existing)
    const handleImportJson = useCallback(async (data) => {
        try {
            const { importedTags, importedBubbles } = parseImportData(data);

            setTags(importedTags);
            await saveTagsToFirestore(importedTags);

            setBubbles(importedBubbles);
            await saveBubblesToFirestore(importedBubbles);

            // TODO: replace with proper React state + Matter.js reinit to avoid full page reload.
            // Imported bubbles are plain objects without Matter.js .body references; the physics
            // engine initialisation useEffect runs only once on mount, so a reload is required
            // to reattach physics bodies to the freshly imported bubbles.
            window.location.reload();
        } catch (e) {
            logger.error('Import JSON failed', e);
        }
    }, [setTags, setBubbles]);

    return { handleExportJson, handleImportJson };
}
