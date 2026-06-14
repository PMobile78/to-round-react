/**
 * JSON export helper extracted from BubblesPage.
 */
import logger from './logger';

// Helpers for JSON export
export const exportJsonFile = (dataObject, filename) => {
    try {
        const blob = new Blob([JSON.stringify(dataObject, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
    } catch (e) {
        logger.error('Export JSON failed', e);
    }
};
