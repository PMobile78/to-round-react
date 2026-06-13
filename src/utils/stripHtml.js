// Извлекает плоский текст из HTML-описания задачи (TipTap хранит описания как HTML).
// Кэш по строке-источнику: описания меняются редко, а поиск дёргает функцию на каждый ввод.
const cache = new Map();
const MAX_CACHE = 2000;

export const stripHtml = (html) => {
    if (!html) return '';
    if (!/[<&]/.test(html)) return html; // plain text — без парсинга
    const hit = cache.get(html);
    if (hit !== undefined) return hit;
    const docEl = new DOMParser().parseFromString(html, 'text/html');
    const text = (docEl.body.textContent || '').replace(/\s+/g, ' ').trim();
    if (cache.size >= MAX_CACHE) cache.clear();
    cache.set(html, text);
    return text;
};
