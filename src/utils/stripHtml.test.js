// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { stripHtml } from './stripHtml';

describe('stripHtml', () => {
    it('extracts plain text from HTML', () => {
        expect(stripHtml('<p>привет <strong>мир</strong></p>')).toBe('привет мир');
    });

    it('joins text split by inline tags', () => {
        expect(stripHtml('фо<em>о</em>бар')).toContain('фообар');
    });

    it('passes plain text through unchanged', () => {
        expect(stripHtml('just text')).toBe('just text');
    });

    it('returns empty string for empty/null input', () => {
        expect(stripHtml('')).toBe('');
        expect(stripHtml(null)).toBe('');
        expect(stripHtml(undefined)).toBe('');
    });

    it('does not match tag names in the extracted text', () => {
        expect(stripHtml('<span>текст</span>').toLowerCase().includes('span')).toBe(false);
    });

    it('collapses whitespace', () => {
        expect(stripHtml('<p>a</p>\n  <p>b</p>')).toBe('a b');
    });
});
