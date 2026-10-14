/**
 * v1 -> v2 description conversion (data contract v2, spec sections 5 and 9.2).
 * - htmlToMarkdown: TipTap HTML -> Markdown (CommonMark + GFM task lists and strikethrough).
 *   Unsupported formatting (underline, colour, highlight, alignment, tables, images) is
 *   reduced to plain text and reported through `lossy: true`.
 * - plainTextToMarkdown: plain text -> Markdown that renders as the same text.
 * Needs a DOMParser (browser, or happy-dom in tests).
 */

const SAFE_LINK = /^(https?:|mailto:)/i;
const HTTP_IMAGE = /^https?:/i;

const escapeInline = (text) => text
    .replace(/[\\`*_[\]<>~]/g, (ch) => `\\${ch}`)
    .replace(/&(?=#?[a-z0-9]+;)/gi, '\\&');

const escapeLineStart = (line) => {
    if (/^(=+|-+)\s*$/.test(line)) return `\\${line}`;
    return line
        .replace(/^(\s*)#/, '$1\\#')
        .replace(/^(\s*)([-+])(\s)/, '$1\\$2$3')
        .replace(/^(\s*)(\d+)([.)])(\s|$)/, '$1$2\\$3$4');
};

const escapeLines = (text) => text.split('\n').map(escapeLineStart).join('\n');

// A hard break at the very end of a block renders as a literal "\" in CommonMark.
const dropTrailingBreaks = (text) => text.replace(/(?:\\\n\s*)+$/, '');

const wrap = (inner, mark) => {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner);
    return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : inner;
};

const codeSpan = (text) => {
    const ticks = text.includes('`') ? '``' : '`';
    const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
    return `${ticks}${pad}${text}${pad}${ticks}`;
};

const linkTarget = (href) => (/[\s()<>]/.test(href) ? `<${href.replace(/>/g, '%3E')}>` : href);

const imageLink = (el, state) => {
    state.lossy = true;
    const src = el.getAttribute('src') || '';
    return HTTP_IMAGE.test(src) ? `[image](${linkTarget(src)})` : '';
};

const renderInline = (nodes, state) => {
    let out = '';
    for (const node of nodes) {
        if (node.nodeType === 3) {
            out += escapeInline(node.nodeValue.replace(/\s*\n\s*/g, ' '));
            continue;
        }
        if (node.nodeType !== 1) continue;
        const tag = node.tagName.toLowerCase();
        const inner = () => renderInline(node.childNodes, state);
        switch (tag) {
            case 'strong':
            case 'b':
                out += wrap(inner(), '**');
                break;
            case 'em':
            case 'i':
                out += wrap(inner(), '*');
                break;
            case 's':
            case 'del':
            case 'strike':
                out += wrap(inner(), '~~');
                break;
            case 'code':
                out += codeSpan(node.textContent);
                break;
            case 'a': {
                const href = node.getAttribute('href') || '';
                if (SAFE_LINK.test(href)) {
                    out += `[${inner()}](${linkTarget(href)})`;
                } else {
                    state.lossy = true;
                    out += inner();
                }
                break;
            }
            case 'br':
                out += '\\\n';
                break;
            case 'img':
                out += imageLink(node, state);
                break;
            case 'u':
            case 'mark':
                state.lossy = true;
                out += inner();
                break;
            case 'span':
                if (node.getAttribute('style')) state.lossy = true;
                out += inner();
                break;
            default:
                out += inner();
        }
    }
    return out;
};

const paragraph = (el, state) => {
    if ((el.getAttribute('style') || '').includes('text-align')) state.lossy = true;
    return escapeLines(dropTrailingBreaks(renderInline(el.childNodes, state)).trim());
};

const indentRest = (text, marker) => {
    const pad = ' '.repeat(marker.length);
    return text.split('\n').map((line, i) => {
        if (i === 0) return `${marker}${line}`;
        return line ? `${pad}${line}` : line;
    }).join('\n');
};

const renderList = (el, state, ordered) => {
    const start = Number(el.getAttribute('start')) || 1;
    return [...el.children]
        .filter((li) => li.tagName.toLowerCase() === 'li')
        .map((li, i) => indentRest(renderBlocks(li.childNodes, state).join('\n'), ordered ? `${start + i}. ` : '- '))
        .join('\n');
};

const renderTaskList = (el, state) => [...el.children]
    .filter((li) => li.tagName.toLowerCase() === 'li')
    .map((li) => {
        const checked = li.getAttribute('data-checked') === 'true';
        const content = [...li.children].find((c) => c.tagName.toLowerCase() === 'div') || li;
        const body = renderBlocks(content.childNodes, state).join('\n');
        return indentRest(body, '- ').replace(/^- /, checked ? '- [x] ' : '- [ ] ');
    })
    .join('\n');

const renderTable = (el, state) => {
    state.lossy = true;
    return [...el.querySelectorAll('tr')]
        .map((tr) => [...tr.children].map((cell) => escapeInline(cell.textContent.trim())).filter(Boolean).join(' · '))
        .filter(Boolean)
        .map(escapeLineStart);
};

const codeBlock = (el) => {
    const code = el.querySelector('code');
    const lang = ((code && code.getAttribute('class')) || '').match(/language-([\w+#-]+)/);
    const text = (code || el).textContent.replace(/\n$/, '');
    const fence = text.includes('```') ? '````' : '```';
    return `${fence}${lang ? lang[1] : ''}\n${text}\n${fence}`;
};

function renderBlocks(nodes, state) {
    const blocks = [];
    let inlineRun = [];
    const flushInline = () => {
        const text = escapeLines(dropTrailingBreaks(renderInline(inlineRun, state)).trim());
        if (text) blocks.push(text);
        inlineRun = [];
    };
    for (const node of nodes) {
        const tag = node.nodeType === 1 ? node.tagName.toLowerCase() : null;
        const isBlock = tag && /^(p|h[1-6]|ul|ol|blockquote|pre|hr|table|div)$/.test(tag);
        if (!isBlock && !(tag === 'img' && node.parentElement && node.parentElement.tagName.toLowerCase() === 'body')) {
            inlineRun.push(node);
            continue;
        }
        flushInline();
        if (tag === 'img') {
            const link = imageLink(node, state);
            if (link) blocks.push(link);
            continue;
        }
        switch (tag) {
            case 'p': {
                const text = paragraph(node, state);
                if (text) blocks.push(text);
                break;
            }
            case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
                const text = renderInline(node.childNodes, state).trim();
                if (text) blocks.push(`${'#'.repeat(Number(tag[1]))} ${text}`);
                break;
            }
            case 'ul':
                blocks.push(node.getAttribute('data-type') === 'taskList'
                    ? renderTaskList(node, state)
                    : renderList(node, state, false));
                break;
            case 'ol':
                blocks.push(renderList(node, state, true));
                break;
            case 'blockquote': {
                const inner = renderBlocks(node.childNodes, state).join('\n\n');
                if (inner) blocks.push(inner.split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n'));
                break;
            }
            case 'pre':
                blocks.push(codeBlock(node));
                break;
            case 'hr':
                blocks.push('---');
                break;
            case 'table':
                blocks.push(...renderTable(node, state));
                break;
            default: // div
                blocks.push(...renderBlocks(node.childNodes, state));
        }
    }
    flushInline();
    return blocks.filter((b) => b !== '');
}

/** TipTap HTML -> { markdown, lossy }. */
export const htmlToMarkdown = (html) => {
    const state = { lossy: false };
    const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
    return { markdown: renderBlocks(doc.body.childNodes, state).join('\n\n').trim(), lossy: state.lossy };
};

/**
 * Plain text -> Markdown that renders as the same text (line breaks kept as hard breaks).
 * Lines are trimmed: CommonMark drops leading spaces in paragraphs anyway, and 4+ of them
 * at the start of a paragraph would turn it into a code block.
 */
export const plainTextToMarkdown = (text) => (text || '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((para) => para.split('\n').map((line) => escapeLineStart(escapeInline(line.trim()))).join('\\\n'))
    .filter(Boolean)
    .join('\n\n');
