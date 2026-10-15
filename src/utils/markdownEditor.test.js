// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import fixtures from '../../contract/fixtures/markdown-v1.json';
import { descriptionExtensions, markdownOf } from './markdownEditor';

let editor;
const open = (markdown) => {
    editor = new Editor({ extensions: descriptionExtensions(), content: markdown, contentType: 'markdown' });
    return editor;
};

afterEach(() => editor?.destroy());

describe('description editor: Markdown in, the same Markdown out (spec 5)', () => {
    const stored = [...fixtures.html, ...fixtures.plain].map((f) => [f.name, f.markdown]);

    it.each(stored)('keeps the stored description "%s" as it was', (name, markdown) => {
        expect(markdownOf(open(markdown))).toBe(markdown);
    });

    it('keeps lines that start with "# ", "- " or "1. " plain text, not a heading or a list', () => {
        const markdown = '\\# not a heading\\\n\\- not a list\\\n1\\. not a numbered list';
        const opened = open(markdown);
        expect(opened.getHTML()).not.toMatch(/<h1|<ul|<ol/);
        expect(markdownOf(opened)).toBe(markdown);
    });

    it('keeps links with http, https and mailto and drops any other scheme', () => {
        expect(markdownOf(open('[pay](javascript:alert(1)) [site](https://example.com) [mail](mailto:a@example.com)')))
            .toBe('pay [site](https://example.com) [mail](mailto:a@example.com)');
    });

    it('reads raw HTML as the editor\'s own formatting and never as markup', () => {
        const opened = open('<b>raw</b> <img src="x" onerror="alert(1)">');
        expect(opened.getHTML()).not.toContain('<img');
        expect(markdownOf(opened)).toBe('**raw**');
    });
});
