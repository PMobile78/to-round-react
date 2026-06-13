/**
 * Shared date/time utilities extracted from BubblesPage and AddNotification.
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
 * Parses local time from string without UTC conversion.
 * Handles ISO strings with Z/+/- as UTC; otherwise interprets as local time.
 * Format: "YYYY-MM-DDTHH:mm:ss"
 */
export const parseLocalDateTime = (dateString) => {
    if (!dateString) return null;
    try {
        // If ISO string with Z or +/-, parse as usual
        if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-', 10)) {
            const date = new Date(dateString);
            return Number.isFinite(date.getTime()) ? date : null;
        }
        // Otherwise interpret as local time (format "YYYY-MM-DDTHH:mm:ss")
        const [datePart, timePart] = dateString.split('T');
        if (!datePart || !timePart) {
            const date = new Date(dateString);
            return Number.isFinite(date.getTime()) ? date : null;
        }

        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);

        const date = new Date(year, month - 1, day, hours, minutes, seconds);
        return Number.isFinite(date.getTime()) ? date : null;
    } catch (_) {
        return null;
    }
};

/**
 * Calculates notification offset in milliseconds.
 * Supports:
 *   - String presets: '10m', '2h', '3d', '2w' (NEW: weeks support)
 *   - Custom object: {type: 'custom', value: N, unit: 'minutes'|'hours'|'days'|'weeks'}
 *   - Unknown input: returns 0
 */
export const getOffsetMs = (notification) => {
    if (!notification) return 0;

    if (typeof notification === 'string') {
        const num = parseInt(notification);
        if (!Number.isFinite(num)) return 0;

        if (notification.endsWith('m')) return num * 60 * 1000;
        if (notification.endsWith('h')) return num * 60 * 60 * 1000;
        if (notification.endsWith('d')) return num * 24 * 60 * 60 * 1000;
        if (notification.endsWith('w')) return num * 7 * 24 * 60 * 60 * 1000;
        return 0;
    }

    if (typeof notification === 'object' && notification.type === 'custom') {
        const v = Number(notification.value);
        switch (notification.unit) {
            case 'minutes': return v * 60 * 1000;
            case 'hours': return v * 60 * 60 * 1000;
            case 'days': return v * 24 * 60 * 60 * 1000;
            case 'weeks': return v * 7 * 24 * 60 * 60 * 1000;
            default: return 0;
        }
    }
    return 0;
};
