/**
 * The task description editor (data contract v2, spec section 5): TipTap reads the stored
 * Markdown with @tiptap/markdown, and the description is written back with the contract
 * converter (src/contract/markdown.js). The serializer of @tiptap/markdown 3.32 does not escape
 * the start of a line ("\# text" comes back as "# text", a heading at the next open); the contract
 * converter does. Links keep only http, https and mailto.
 */
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import OrderedList from '@tiptap/extension-ordered-list';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from '@tiptap/markdown';
import { Marked, Tokenizer } from 'marked';
import { htmlToMarkdown } from '../contract/markdown';

export const SAFE_LINK = /^(https?:|mailto:)/i;

/**
 * marked's blockquote reads the list at the end of a quote again with list() when lines without ">"
 * go on after the quote. marked's own list() knows no letters or roman numerals of TipTap's ordered
 * list ("a.", "ii."), finds nothing, and marked 17 throws; TipTap's tokenizer reads such a list.
 */
class DescriptionTokenizer extends Tokenizer {
    list(src) {
        return super.list(src) ?? OrderedList.config.markdownTokenizer.tokenize(src, [], this.lexer);
    }
}

/**
 * A code block whose fence starts after spaces (CommonMark allows three). TipTap's CodeBlock reads a
 * fence only at the start of its line and gives nothing for it; @tiptap/markdown then tries this one.
 */
const FenceAfterSpaces = Extension.create({
    name: 'fenceAfterSpaces',
    markdownTokenName: 'code',
    parseMarkdown: (token, helpers) => helpers.createNode(
        'codeBlock', { language: token.lang || null }, token.text ? [helpers.createTextNode(token.text)] : [],
    ),
});

/** The editor's extensions: the syntax of spec 5 and nothing Markdown cannot keep (no underline). */
export const descriptionExtensions = (placeholder = '') => [
    StarterKit.configure({
        underline: false,
        link: {
            openOnClick: false,
            isAllowedUri: (url) => SAFE_LINK.test(url),
        },
    }),
    FenceAfterSpaces,
    Placeholder.configure({ placeholder }),
    TaskList,
    TaskItem.configure({ nested: true }),
    // setOptions: new Marked({ tokenizer }) takes only enumerable properties, not the methods of a class.
    Markdown.configure({ marked: new Marked().setOptions({ tokenizer: new DescriptionTokenizer() }) }),
];

/** The editor's content as the description to store. */
export const markdownOf = (editor) => htmlToMarkdown(editor.getHTML()).markdown;
