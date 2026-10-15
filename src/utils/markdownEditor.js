/**
 * The task description editor (data contract v2, spec section 5): TipTap reads the stored
 * Markdown with @tiptap/markdown, and the description is written back with the contract
 * converter (src/contract/markdown.js). The serializer of @tiptap/markdown 3.32 does not escape
 * the start of a line ("\# text" comes back as "# text", a heading at the next open); the contract
 * converter does. Links keep only http, https and mailto.
 */
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from '@tiptap/markdown';
import { htmlToMarkdown } from '../contract/markdown';

export const SAFE_LINK = /^(https?:|mailto:)/i;

/** The editor's extensions: the syntax of spec 5 and nothing Markdown cannot keep (no underline). */
export const descriptionExtensions = (placeholder = '') => [
    StarterKit.configure({
        underline: false,
        link: {
            openOnClick: false,
            isAllowedUri: (url) => SAFE_LINK.test(url),
        },
    }),
    Placeholder.configure({ placeholder }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Markdown,
];

/** The editor's content as the description to store. */
export const markdownOf = (editor) => htmlToMarkdown(editor.getHTML()).markdown;
