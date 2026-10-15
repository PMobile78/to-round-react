// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MarkdownEditor from './MarkdownEditor';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('MarkdownEditor: a task description stored as Markdown (spec 5)', () => {
    let container;
    let root;
    let onChange;

    const render = (value) => act(() => root.render(<MarkdownEditor value={value} onChange={onChange} t={(key) => key} />));
    // TipTap keeps its editor on the ProseMirror element.
    const editor = () => container.querySelector('.ProseMirror').editor;
    const button = (label) => container.querySelector(`button[aria-label="categories.richTextEditor.${label}"]`);

    beforeEach(() => {
        onChange = vi.fn();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.unstubAllGlobals();
    });

    it('shows the stored Markdown formatted and reports no edit', () => {
        render('**Buy** milk\n\n- [ ] bread');
        expect(container.querySelector('.ProseMirror strong').textContent).toBe('Buy');
        expect(container.querySelector('.ProseMirror input[type="checkbox"]')).not.toBeNull();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('hands back Markdown when the user formats text from the toolbar', () => {
        render('milk');
        act(() => { editor().commands.selectAll(); });
        act(() => button('bold').click());
        expect(onChange).toHaveBeenLastCalledWith('**milk**');
    });

    it('keeps a line that starts with "# " plain text when the user edits the description', () => {
        render('\\# not a heading');
        act(() => { editor().commands.insertContentAt(editor().state.doc.content.size - 1, '!'); });
        expect(onChange).toHaveBeenLastCalledWith('\\# not a heading!');
    });

    it('shows a description that changed outside the editor without reporting it as an edit', () => {
        render('old');
        render('new **text**');
        expect(container.querySelector('.ProseMirror').textContent).toBe('new text');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('adds a link only with http, https or mailto', () => {
        render('site');
        // happy-dom has no window.prompt: the toolbar asks for the address with it.
        const prompt = vi.fn(() => 'javascript:alert(1)');
        vi.stubGlobal('prompt', prompt);
        act(() => { editor().commands.selectAll(); });
        act(() => button('link').click());
        expect(onChange).not.toHaveBeenCalled();

        prompt.mockReturnValue('https://example.com');
        act(() => { editor().commands.selectAll(); });
        act(() => button('link').click());
        expect(onChange).toHaveBeenLastCalledWith('[site](https://example.com)');
    });
});
