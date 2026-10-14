// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import fixtures from '../../contract/fixtures/markdown-v1.json';
import { htmlToMarkdown, plainTextToMarkdown } from './markdown';

describe('htmlToMarkdown (contract fixtures)', () => {
    it.each(fixtures.html)('$name', ({ input, markdown, lossy }) => {
        expect(htmlToMarkdown(input)).toEqual({ markdown, lossy });
    });
});

describe('plainTextToMarkdown (contract fixtures)', () => {
    it.each(fixtures.plain)('$name', ({ input, markdown }) => {
        expect(plainTextToMarkdown(input)).toBe(markdown);
    });
});
