import React from 'react';
import {
    Box,
    IconButton,
    Tooltip,
    Divider,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    FormatBold,
    FormatItalic,
    FormatUnderlined,
    FormatStrikethrough,
    FormatListBulleted,
    FormatListNumbered,
    FormatAlignLeft,
    FormatAlignCenter,
    FormatAlignRight,
    FormatAlignJustify,
    Highlight as HighlightIcon,
    Palette,
    Link as LinkIcon,
    Image as ImageIcon,
    TableChart,
    DataObject as CodeBlockIcon,
    FormatQuote,
    HorizontalRule as HorizontalRuleIcon,
    CheckBox
} from '@mui/icons-material';

/**
 * Toolbar for the TipTap rich text editor.
 * Props:
 *   editor     — TipTap editor instance (required)
 *   t          — i18n translation function (optional)
 *   themeMode  — 'light' | 'dark'
 */
export default function RichTextToolbar({ editor, t, themeMode = 'light' }) {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
    const buttonSize = isSmallScreen ? 'small' : 'medium';
    const iconSize = isSmallScreen ? 18 : 20;

    if (!editor) return null;

    return (
        <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5,
            padding: 1,
            borderBottom: `1px solid ${themeMode === 'light' ? '#e0e0e0' : '#444'}`,
            backgroundColor: themeMode === 'light' ? '#f5f5f5' : '#2a2a2a',
            borderRadius: '4px 4px 0 0'
        }}>
            {/* Text Formatting */}
            <Tooltip title={t?.('categories.richTextEditor.bold') || 'Bold'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    sx={{
                        color: editor.isActive('bold') ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <FormatBold sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={t?.('categories.richTextEditor.italic') || 'Italic'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    sx={{
                        color: editor.isActive('italic') ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <FormatItalic sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={t?.('categories.richTextEditor.underline') || 'Underline'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    sx={{
                        color: editor.isActive('underline') ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <FormatUnderlined sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={t?.('categories.richTextEditor.strikethrough') || 'Strikethrough'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    sx={{
                        color: editor.isActive('strike') ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <FormatStrikethrough sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* Lists */}
            <Tooltip title={t?.('categories.richTextEditor.bulletList') || 'Bullet List'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    sx={{
                        color: editor.isActive('bulletList') ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <FormatListBulleted sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={t?.('categories.richTextEditor.numberedList') || 'Numbered List'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    sx={{
                        color: editor.isActive('orderedList') ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <FormatListNumbered sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={t?.('categories.richTextEditor.taskList') || 'Task List'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                    sx={{
                        color: editor.isActive('taskList') ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <CheckBox sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* Text Alignment */}
            <Tooltip title={t?.('categories.richTextEditor.alignLeft') || 'Align Left'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    sx={{
                        color: editor.isActive({ textAlign: 'left' }) ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <FormatAlignLeft sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={t?.('categories.richTextEditor.alignCenter') || 'Align Center'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    sx={{
                        color: editor.isActive({ textAlign: 'center' }) ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <FormatAlignCenter sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={t?.('categories.richTextEditor.alignRight') || 'Align Right'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    sx={{
                        color: editor.isActive({ textAlign: 'right' }) ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <FormatAlignRight sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={t?.('categories.richTextEditor.alignJustify') || 'Align Justify'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    sx={{
                        color: editor.isActive({ textAlign: 'justify' }) ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <FormatAlignJustify sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* Highlight */}
            <Tooltip title={t?.('categories.richTextEditor.highlight') || 'Highlight'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    sx={{
                        color: editor.isActive('highlight') ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <HighlightIcon sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={t?.('categories.richTextEditor.textColor') || 'Text Color'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => {
                        const color = prompt(t?.('categories.richTextEditor.enterColor') || 'Enter color (e.g.: #ff0000 or red):', '#000000');
                        if (color) {
                            editor.chain().focus().setColor(color).run();
                        }
                    }}
                    sx={{
                        color: editor.isActive('textStyle') ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <Palette sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* Additional Tools */}
            <Tooltip title={t?.('categories.richTextEditor.link') || 'Link'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => {
                        const url = prompt(t?.('categories.richTextEditor.enterUrl') || 'Enter URL:', 'https://');
                        if (url) {
                            const sanitizedUrl = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/') ? url : null;
                            if (sanitizedUrl) {
                                editor.chain().focus().setLink({ href: sanitizedUrl }).run();
                            }
                        }
                    }}
                    sx={{
                        color: editor.isActive('link') ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <LinkIcon sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={t?.('categories.richTextEditor.image') || 'Image'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => {
                        const url = prompt(t?.('categories.richTextEditor.enterImageUrl') || 'Enter image URL:', 'https://');
                        if (url) {
                            const sanitizedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : null;
                            if (sanitizedUrl) {
                                editor.chain().focus().setImage({ src: sanitizedUrl }).run();
                            }
                        }
                    }}
                    sx={{
                        color: editor.isActive('image') ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <ImageIcon sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={t?.('categories.richTextEditor.table') || 'Table'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                    sx={{
                        color: editor.isActive('table') ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <TableChart sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={t?.('categories.richTextEditor.codeBlock') || 'Code Block'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    sx={{
                        color: editor.isActive('codeBlock') ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <CodeBlockIcon sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={t?.('categories.richTextEditor.blockquote') || 'Quote'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    sx={{
                        color: editor.isActive('blockquote') ? 'primary.main' : 'inherit',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <FormatQuote sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={t?.('categories.richTextEditor.horizontalRule') || 'Horizontal Line'}>
                <IconButton
                    size={buttonSize}
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    sx={{
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
                    }}
                >
                    <HorizontalRuleIcon sx={{ fontSize: iconSize }} />
                </IconButton>
            </Tooltip>
        </Box>
    );
}
