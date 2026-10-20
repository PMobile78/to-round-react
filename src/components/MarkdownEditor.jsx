import React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Box } from '@mui/material';
import MarkdownToolbar from './MarkdownToolbar';
import { useEditorResize } from '../hooks/useEditorResize';
import { descriptionExtensions, markdownOf } from '../utils/markdownEditor';

const contentSx = (isMobile) => ({
    '& .ProseMirror': {
        outline: 'none',
        minHeight: isMobile ? 'auto' : 300,
        p: isMobile ? 1 : 1.5,
        fontSize: isMobile ? 16 : 14,
        lineHeight: 1.5,
        color: 'text.primary',
        wordBreak: 'break-word',
        '& p, & h1, & h2, & h3, & h4, & h5, & h6, & li': { m: 0 },
        '& ul, & ol': { m: 0, pl: 3 },
        '& a': { color: 'primary.main' },
        '& blockquote': { m: 0, pl: 2, borderLeft: 2, borderColor: 'divider' },
        '& pre': { m: 0, p: 1, borderRadius: 1, bgcolor: 'action.hover', overflowX: 'auto' },
        '& code': { fontFamily: 'monospace' },
        '& hr': { border: 0, borderTop: 1, borderColor: 'divider', my: 2 },
        '& ul[data-type="taskList"]': { listStyle: 'none', pl: 0.5 },
        '& ul[data-type="taskList"] li': { display: 'flex', alignItems: 'flex-start', gap: 1 },
        '& ul[data-type="taskList"] li > label': { flex: '0 0 auto', userSelect: 'none' },
        '& ul[data-type="taskList"] li > div': { flex: '1 1 auto', minWidth: 0 },
        '& p.is-editor-empty:first-of-type::before': {
            content: 'attr(data-placeholder)',
            color: 'text.disabled',
            float: 'left',
            height: 0,
            pointerEvents: 'none',
        },
    },
});

/**
 * Visual editor of a task description (spec 5). value and onChange carry the stored Markdown.
 * A value that changes from outside (the dialog opens another task, another device saved this
 * one) replaces the content and is not reported back as an edit.
 */
export default function MarkdownEditor({ value = '', onChange, placeholder = '', isMobile = false, t }) {
    const { editorHeight, handleDragStart } = useEditorResize(300);
    const onChangeRef = React.useRef(onChange);
    onChangeRef.current = onChange;
    // The Markdown on screen: what the editor last showed or reported.
    const shownRef = React.useRef(value);
    const extensions = React.useMemo(() => descriptionExtensions(placeholder), [placeholder]);

    const editor = useEditor({
        extensions,
        content: value,
        contentType: 'markdown',
        onUpdate: ({ editor: current }) => {
            shownRef.current = markdownOf(current);
            onChangeRef.current(shownRef.current);
        },
    }, [extensions]);

    React.useEffect(() => {
        if (!editor || value === shownRef.current) return;
        shownRef.current = value;
        editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
    }, [editor, value]);

    if (!editor) return null;

    return (
        <Box sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
            resize: isMobile ? 'none' : 'vertical',
            minHeight: 220,
            height: isMobile ? editorHeight : undefined,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <MarkdownToolbar editor={editor} t={t} />
            <Box sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                WebkitOverflowScrolling: isMobile ? 'touch' : undefined,
                overscrollBehavior: isMobile ? 'contain' : undefined,
                pb: isMobile ? 3.5 : 0,
                ...contentSx(isMobile),
            }}>
                <EditorContent editor={editor} />
            </Box>
            {isMobile && (
                <Box
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                    sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 28,
                        cursor: 'ns-resize',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.hover',
                        borderTop: 1,
                        borderColor: 'divider',
                    }}
                >
                    <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'text.disabled' }} />
                </Box>
            )}
        </Box>
    );
}
