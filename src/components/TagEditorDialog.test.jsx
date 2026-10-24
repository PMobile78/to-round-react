// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TagEditorDialog from './TagEditorDialog';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } }),
}));

const HOME = { id: 'home', name: 'Home', color: '#da3833', order: 1 };
const WORK = { id: 'work', name: 'Work', color: '#ee603c', order: 2 };
const FREE_COLOR = '#fd8b2b';

describe('TagEditorDialog: the name of another category (data contract v2, 3.2)', () => {
    let container;
    let root;

    const render = ({ editingTag = null, tagName, tagColor = FREE_COLOR }) => act(() => root.render(
        <TagEditorDialog
            open
            onClose={vi.fn()}
            isSmallScreen={false}
            isMobile={false}
            colorPalette={[HOME.color, WORK.color, FREE_COLOR]}
            tags={[HOME, WORK]}
            editingTag={editingTag}
            tagName={tagName}
            setTagName={vi.fn()}
            tagColor={tagColor}
            setTagColor={vi.fn()}
            isColorAvailable={(color) => color === FREE_COLOR || color === editingTag?.color}
            canCreateMoreTags={() => true}
            onSave={vi.fn()}
        />
    ));
    const button = (text) => Array.from(document.querySelectorAll('button')).find((el) => el.textContent === text);
    const nameInput = () => {
        const label = Array.from(document.querySelectorAll('label')).find((el) => el.textContent === 'bubbles.tagName');
        return document.getElementById(label.htmlFor);
    };
    // The text tied to the name field, shown under it
    const nameHelperText = () => {
        const id = nameInput().getAttribute('aria-describedby');
        return id ? document.getElementById(id).textContent : null;
    };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('shows the error under the name and keeps Create disabled', () => {
        render({ tagName: ' home ' });
        expect(nameHelperText()).toBe('bubbles.tagNameExists');
        expect(nameInput().getAttribute('aria-invalid')).toBe('true');
        expect(button('bubbles.create').disabled).toBe(true);
    });

    it('keeps Save disabled when an edited category takes the name of another one', () => {
        render({ editingTag: HOME, tagName: 'WORK', tagColor: HOME.color });
        expect(nameHelperText()).toBe('bubbles.tagNameExists');
        expect(button('bubbles.save').disabled).toBe(true);
    });

    it('accepts a name no other category has', () => {
        render({ tagName: 'Garden' });
        expect(nameHelperText()).toBe(null);
        expect(nameInput().getAttribute('aria-invalid')).toBe('false');
        expect(button('bubbles.create').disabled).toBe(false);
    });

    it('lets an edited category keep its own name in another case', () => {
        render({ editingTag: HOME, tagName: 'HOME', tagColor: HOME.color });
        expect(nameHelperText()).toBe(null);
        expect(button('bubbles.save').disabled).toBe(false);
    });
});
