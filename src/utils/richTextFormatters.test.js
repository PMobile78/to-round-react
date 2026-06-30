import { describe, it, expect } from 'vitest';
import { htmlToPlainText, escapeHtmlPlain, plainToRichHtml } from './richTextFormatters';

describe('htmlToPlainText', () => {
    it('strips tags from HTML', () => {
        expect(htmlToPlainText('<p>hello</p>')).toBe('hello');
        expect(htmlToPlainText('<p>hello <strong>world</strong></p>')).toBe('hello world');
    });

    it('returns empty string for empty HTML', () => {
        expect(htmlToPlainText('')).toBe('');
        expect(htmlToPlainText('<p></p>')).toBe('');
        expect(htmlToPlainText('<p><br></p>')).toBe('');
    });

    it('handles whitespace correctly', () => {
        expect(htmlToPlainText('  <p>  spaced  </p>  ')).toBe('spaced');
    });

    it('handles non-string input', () => {
        expect(htmlToPlainText(null)).toBe('');
        expect(htmlToPlainText(undefined)).toBe('');
    });
});

describe('escapeHtmlPlain', () => {
    it('escapes HTML special characters', () => {
        expect(escapeHtmlPlain('<a>&"')).toBe('&lt;a&gt;&amp;&quot;');
    });

    it('escapes ampersands', () => {
        expect(escapeHtmlPlain('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('escapes quotes', () => {
        expect(escapeHtmlPlain('He said "hello"')).toBe('He said &quot;hello&quot;');
    });

    it('handles multiple special characters', () => {
        expect(escapeHtmlPlain('foo<bar&baz>qux')).toBe('foo&lt;bar&amp;baz&gt;qux');
    });
});

describe('plainToRichHtml', () => {
    it('wraps plain text in <p> tags', () => {
        expect(plainToRichHtml('hello')).toBe('<p>hello</p>');
    });

    it('converts newlines to <br>', () => {
        expect(plainToRichHtml('line1\nline2')).toBe('<p>line1<br>line2</p>');
        expect(plainToRichHtml('line1\r\nline2')).toBe('<p>line1<br>line2</p>');
    });

    it('preserves markup that looks like HTML', () => {
        expect(plainToRichHtml('<strong>bold</strong> text')).toBe('<strong>bold</strong> text');
    });

    it('escapes angle brackets in plain text', () => {
        expect(plainToRichHtml('less < greater')).toBe('<p>less &lt; greater</p>');
    });

    it('preserves existing markup', () => {
        expect(plainToRichHtml('<p>already marked</p>')).toBe('<p>already marked</p>');
        expect(plainToRichHtml('<strong>bold</strong>')).toBe('<strong>bold</strong>');
    });

    it('returns empty string for empty input', () => {
        expect(plainToRichHtml('')).toBe('');
        expect(plainToRichHtml('  ')).toBe('');
        expect(plainToRichHtml(null)).toBe('');
    });

    it('handles whitespace in text', () => {
        expect(plainToRichHtml('  hello  ')).toBe('<p>hello</p>');
    });
});
