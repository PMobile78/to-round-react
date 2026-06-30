/**
 * Pure HTML/text formatter helpers for rich text editing.
 * No React dependencies — can be unit-tested independently.
 */

export function htmlToPlainText(html) {
    if (!html || typeof html !== 'string') return '';
    const trimmed = html.trim();
    if (!trimmed || trimmed === '<p></p>' || trimmed === '<p><br></p>') return '';
    try {
        if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const text = (doc.body?.textContent || '').replace(/ /g, ' ').trim();
            return text;
        }
    } catch (_) { /* ignore */ }
    return html.replace(/<[^>]*>/g, '').trim();
}

export function escapeHtmlPlain(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Обертка простого текста в минимальный HTML для TipTap (если ещё не разметка).
 */
export function plainToRichHtml(value) {
    const raw = value == null ? '' : String(value);
    const t = raw.trim();
    if (!t) return '';
    if (t.startsWith('<') && t.includes('>')) return raw;
    return `<p>${escapeHtmlPlain(t).replace(/\r\n/g, '\n').replace(/\n/g, '<br>')}</p>`;
}
