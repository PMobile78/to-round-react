import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import CodeBlock from '@tiptap/extension-code-block';
import Blockquote from '@tiptap/extension-blockquote';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import {
    Box,
    IconButton,
    Tooltip,
    Divider,
    useTheme,
    useMediaQuery,
    Switch,
    FormControlLabel,
    Typography
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
    TextFields,
    Code,
    CheckBox,
    Link as LinkIcon,
    Image as ImageIcon,
    TableChart,
    DataObject as CodeBlockIcon,
    FormatQuote,
    HorizontalRule as HorizontalRuleIcon
} from '@mui/icons-material';

const RichTextEditor = ({
    value = '',
    onChange,
    placeholder = 'Введите описание...',
    isMobile = false,
    themeMode = 'light',
    useRichText = false,
    onToggleRichText,
    t
}) => {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

    const onChangeRef = React.useRef(onChange);
    onChangeRef.current = onChange;

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Underline,
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'rich-text-link',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rich-text-image',
                },
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            CodeBlock,
            Blockquote,
            HorizontalRule,
        ],
        content: '',
        onUpdate: ({ editor }) => {
            onChangeRef.current(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none',
                style: {
                    fontSize: isMobile ? '16px' : '14px',
                    lineHeight: '1.5',
                    minHeight: useRichText ? '300px' : '120px',
                    padding: isMobile ? '16px' : '20px',
                    border: `1px solid ${themeMode === 'light' ? '#ccc' : '#555'}`,
                    borderRadius: '4px',
                    backgroundColor: themeMode === 'light' ? '#fff' : '#333',
                    color: themeMode === 'light' ? '#000' : '#fff',
                    caretColor: themeMode === 'light' ? '#000' : '#fff',
                    resize: useRichText ? 'vertical' : 'vertical',
                    overflow: 'auto'
                }
            }
        }
    }, [useRichText, isMobile, themeMode, placeholder]);

    // Обновляем содержимое редактора при изменении value
    React.useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [editor, value]);

    // Принудительно устанавливаем caret-color через глобальные стили
    React.useEffect(() => {
        const caretColor = themeMode === 'light' ? '#000' : '#fff';
        const styleId = 'prosemirror-caret-color';

        // Удаляем предыдущий стиль
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }

        // Добавляем новый стиль
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .ProseMirror {
                caret-color: ${caretColor} !important;
                padding: ${isMobile ? '16px' : '20px'} !important;
            }
            .ProseMirror * {
                caret-color: ${caretColor} !important;
            }
            .ProseMirror p {
                caret-color: ${caretColor} !important;
            }
            .ProseMirror p:empty {
                caret-color: ${caretColor} !important;
            }
            .ProseMirror div {
                caret-color: ${caretColor} !important;
            }
            .ProseMirror br {
                caret-color: ${caretColor} !important;
            }
            
            /* Стили для TaskList */
            .ProseMirror ul[data-type="taskList"] {
                list-style: none;
                padding: 0;
            }
            .ProseMirror ul[data-type="taskList"] li {
                display: flex;
                align-items: center;
                margin: 0.25rem 0;
            }
            .ProseMirror ul[data-type="taskList"] li > label {
                flex: 0 0 auto;
                margin-right: 0.5rem;
                user-select: none;
                display: flex;
                align-items: center;
            }
            .ProseMirror ul[data-type="taskList"] li > div {
                flex: 1 1 auto;
                min-height: 1.2em;
                display: flex;
                align-items: center;
            }
            .ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
                cursor: pointer;
                margin: 0;
                vertical-align: middle;
            }
            
            /* Стили для ссылок */
            .ProseMirror .rich-text-link {
                color: #1976d2;
                text-decoration: underline;
                cursor: pointer;
            }
            .ProseMirror .rich-text-link:hover {
                text-decoration: none;
            }
            
            /* Стили для изображений */
            .ProseMirror .rich-text-image {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 1rem 0;
            }
            
            /* Стили для таблиц */
            .ProseMirror table {
                border-collapse: collapse;
                table-layout: fixed;
                width: 100%;
                margin: 1rem 0;
                overflow: hidden;
            }
            .ProseMirror table td, .ProseMirror table th {
                min-width: 1em;
                border: 2px solid #ced4da;
                padding: 3px 5px;
                vertical-align: top;
                box-sizing: border-box;
                position: relative;
            }
            .ProseMirror table th {
                font-weight: bold;
                text-align: left;
                background-color: #f1f3f4;
            }
            
            /* Стили для блока кода */
            .ProseMirror pre {
                background: #0d1117;
                color: #c9d1d9;
                font-family: 'JetBrainsMono', 'SFMono-Regular', 'SF Mono', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
                padding: 0.75rem 1rem;
                border-radius: 0.5rem;
                margin: 1rem 0;
                overflow-x: auto;
            }
            .ProseMirror pre code {
                color: inherit;
                padding: 0;
                background: none;
                font-size: 0.8rem;
            }
            
            /* Стили для цитат */
            .ProseMirror blockquote {
                padding-left: 1rem;
                border-left: 2px solid #e0e0e0;
                margin-left: 0;
                margin-right: 0;
                font-style: italic;
            }
            
            /* Стили для горизонтальной линии */
            .ProseMirror hr {
                border: none;
                border-top: 2px solid #e0e0e0;
                margin: 2rem 0;
            }
        `;
        document.head.appendChild(style);

        // Очистка при размонтировании
        return () => {
            const styleToRemove = document.getElementById(styleId);
            if (styleToRemove) {
                styleToRemove.remove();
            }
        };
    }, [themeMode]);

    if (!editor) {
        return null;
    }

    const MenuBar = () => {
        const buttonSize = isSmallScreen ? 'small' : 'medium';
        const iconSize = isSmallScreen ? 18 : 20;

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
                <Tooltip title="Жирный">
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

                <Tooltip title="Курсив">
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

                <Tooltip title="Подчёркнутый">
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

                <Tooltip title="Зачёркнутый">
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
                <Tooltip title="Маркированный список">
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

                <Tooltip title="Нумерованный список">
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

                <Tooltip title="Список с галочками">
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
                <Tooltip title="По левому краю">
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

                <Tooltip title="По центру">
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

                <Tooltip title="По правому краю">
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

                <Tooltip title="По ширине">
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
                <Tooltip title="Выделение">
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

                <Tooltip title="Цвет текста">
                    <IconButton
                        size={buttonSize}
                        onClick={() => {
                            const color = prompt('Введите цвет (например: #ff0000 или red):', '#000000');
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
                <Tooltip title="Ссылка">
                    <IconButton
                        size={buttonSize}
                        onClick={() => {
                            const url = prompt('Введите URL:', 'https://');
                            if (url) {
                                editor.chain().focus().setLink({ href: url }).run();
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

                <Tooltip title="Изображение">
                    <IconButton
                        size={buttonSize}
                        onClick={() => {
                            const url = prompt('Введите URL изображения:', 'https://');
                            if (url) {
                                editor.chain().focus().setImage({ src: url }).run();
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

                <Tooltip title="Таблица">
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

                <Tooltip title="Блок кода">
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

                <Tooltip title="Цитата">
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

                <Tooltip title="Горизонтальная линия">
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
    };

    // Обычное текстовое поле
    const SimpleTextField = () => (
        <Box sx={{
            border: `1px solid ${themeMode === 'light' ? '#ccc' : '#555'}`,
            borderRadius: '4px',
            overflow: 'hidden'
        }}>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: isMobile ? '16px' : '20px',
                    fontSize: isMobile ? '16px' : '14px',
                    lineHeight: '1.5',
                    border: 'none',
                    outline: 'none',
                    resize: 'vertical',
                    backgroundColor: themeMode === 'light' ? '#fff' : '#333',
                    color: themeMode === 'light' ? '#000' : '#fff',
                    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
                }}
            />
        </Box>
    );

    // Панель настроек
    const SettingsPanel = () => (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: 1,
            borderBottom: `1px solid ${themeMode === 'light' ? '#e0e0e0' : '#444'}`,
            backgroundColor: themeMode === 'light' ? '#f8f9fa' : '#2a2a2a',
            borderRadius: '4px 4px 0 0'
        }}>
            <FormControlLabel
                control={
                    <Switch
                        checked={useRichText}
                        onChange={(e) => onToggleRichText?.(e.target.checked)}
                        size="small"
                    />
                }
                label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {useRichText ? <TextFields sx={{ fontSize: 16 }} /> : <Code sx={{ fontSize: 16 }} />}
                        <Typography variant="body2">
                            {useRichText ? (t?.('bubbles.richTextMode') || 'Rich Text') : (t?.('bubbles.plainTextMode') || 'Plain Text')}
                        </Typography>
                    </Box>
                }
            />
        </Box>
    );

    return (
        <Box>
            <SettingsPanel />
            {useRichText ? (
                <Box sx={{
                    border: `1px solid ${themeMode === 'light' ? '#ccc' : '#555'}`,
                    borderRadius: '0 0 4px 4px',
                    overflow: 'auto',
                    resize: 'vertical',
                    minHeight: '300px'
                }}>
                    <MenuBar />
                    <EditorContent
                        editor={editor}
                        sx={{
                            padding: isMobile ? '16px' : '20px',
                            '--caret-color': themeMode === 'light' ? '#000' : '#fff',
                            '& .ProseMirror': {
                                outline: 'none',
                                fontSize: isMobile ? '16px' : '14px',
                                lineHeight: '1.5',
                                minHeight: '300px',
                                padding: `${isMobile ? '16px' : '20px'} !important`,
                                backgroundColor: themeMode === 'light' ? '#fff' : '#333',
                                color: themeMode === 'light' ? '#000' : '#fff',
                                caretColor: `var(--caret-color) !important`,
                                '&:focus': {
                                    caretColor: `var(--caret-color) !important`,
                                },
                                '& *': {
                                    caretColor: `var(--caret-color) !important`,
                                },
                                '& p': {
                                    caretColor: `var(--caret-color) !important`,
                                },
                                '& p:empty': {
                                    caretColor: `var(--caret-color) !important`,
                                },
                                '& p.is-editor-empty': {
                                    caretColor: `var(--caret-color) !important`,
                                },
                                '& div': {
                                    caretColor: `var(--caret-color) !important`,
                                }
                            },
                            '& .ProseMirror p.is-editor-empty:first-child::before': {
                                color: themeMode === 'light' ? '#adb5bd' : '#6c757d',
                                content: `attr(data-placeholder)`,
                                float: 'left',
                                height: 0,
                                pointerEvents: 'none',
                            }
                        }}
                    />
                </Box>
            ) : (
                <SimpleTextField />
            )}
        </Box>
    );
};

export default RichTextEditor;
