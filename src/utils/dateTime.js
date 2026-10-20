/**
 * Shared date/time utilities extracted from BubblesPage.
 * All functions handle local time interpretation (no UTC conversion).
 */

/**
 * Saves local time without UTC conversion.
 * Returns string in format "YYYY-MM-DDTHH:mm:ss" interpreted as local time.
 */
export const formatLocalDateTime = (date) => {
    if (!date) return null;
    try {
        const d = date instanceof Date ? date : new Date(date);
        if (!Number.isFinite(d.getTime())) return null;

        // Format local time without UTC conversion
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    } catch (_) {
        return null;
    }
};

/**
 * Gets user's IANA timezone (e.g., "Europe/Kyiv").
 * Used to save alongside dueDate so Cloud Function (UTC) can interpret local time strings correctly.
 */
export const getUserTimeZone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch (_) {
        return null;
    }
};

/**
 * Formats the build moment (UTC ISO string that CI puts into REACT_APP_BUILD_TIME) in local time
 * as "DD.MM.YYYY HH:mm". Returns "-" when there is no valid time (local dev build).
 */
export const formatBuildTime = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '-';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
