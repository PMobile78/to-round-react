import { useCallback } from 'react';
import { saveBubblesToFirestore, saveTagsToFirestore } from '../services/firestoreService';
import { exportJsonFile } from '../utils/exportJson';
import logger from '../utils/logger';
import { buildExportData, buildExportFilename, parseImportData } from '../utils/bubbleJson';
import { useBubblesStore } from '../state/BubblesStore';

/**
 * JSON import/export handlers extracted from BubblesPage (Task D of #68 / #64).
 *
 * The pure payload-building / parsing lives in ../utils/bubbleJson (unit-tested);
 * this hook keeps only the thin side effects — file download, Firestore writes,
 * state setters and the page reload.
 *
 * `bubbles` and `tags` are read from the BubblesStore; `setBubbles` / `setTags`
 * are obtained from the store as well.
 */
export function useBubbleImportExport() {
    const { bubbles, tags, setBubbles, setTags } = useBubblesStore();

    // Export current data to JSON. Reads bubbles + tags from the BubblesStore.
    // Consumers of this callback are not memoized, so a stable identity here is safe.
    const handleExportJson = useCallback(() => {
        const now = new Date();
        const data = buildExportData({ bubbles, tags }, now);
        const filename = buildExportFilename(now);
        exportJsonFile(data, filename);
    }, [bubbles, tags]);

    // Import data from JSON (replace existing)
    const handleImportJson = useCallback(async (data) => {
        try {
            const { importedTags, importedBubbles } = parseImportData(data);

            await Promise.all([
                saveTagsToFirestore(importedTags),
                saveBubblesToFirestore(importedBubbles),
            ]);

            setTags(importedTags);
            setBubbles(importedBubbles);

            // TODO: replace with proper React state + Matter.js reinit to avoid full page reload.
            // Imported bubbles are plain objects without Matter.js .body references; the physics
            // engine initialisation useEffect runs only once on mount, so a reload is required
            // to reattach physics bodies to the freshly imported bubbles.
            window.location.reload();
        } catch (e) {
            logger.error('Import JSON failed', e);
            // state untouched on failure
        }
    }, [setTags, setBubbles]);

    return { handleExportJson, handleImportJson };
}
