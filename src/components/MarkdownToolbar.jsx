import React from 'react';
import { Box, Divider, IconButton, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import {
    CheckBox,
    FormatBold,
    FormatItalic,
    FormatListBulleted,
    FormatListNumbered,
    FormatStrikethrough,
    Link as LinkIcon,
} from '@mui/icons-material';
import { useEditorState } from '@tiptap/react';
import { SAFE_LINK } from '../utils/markdownEditor';

// The basic set of spec 5: bold, italic, strikethrough, bulleted and numbered lists, checklists
// and links. Headings, quotes, code and rules are shown and kept, but not offered here.
const GROUPS = [
    [
        { name: 'bold', labelKey: 'bold', fallback: 'Bold', Icon: FormatBold, run: (chain) => chain.toggleBold() },
        { name: 'italic', labelKey: 'italic', fallback: 'Italic', Icon: FormatItalic, run: (chain) => chain.toggleItalic() },
        { name: 'strike', labelKey: 'strikethrough', fallback: 'Strikethrough', Icon: FormatStrikethrough, run: (chain) => chain.toggleStrike() },
    ],
    [
        { name: 'bulletList', labelKey: 'bulletList', fallback: 'Bullet List', Icon: FormatListBulleted, run: (chain) => chain.toggleBulletList() },
        { name: 'orderedList', labelKey: 'numberedList', fallback: 'Numbered List', Icon: FormatListNumbered, run: (chain) => chain.toggleOrderedList() },
        { name: 'taskList', labelKey: 'taskList', fallback: 'Task List', Icon: CheckBox, run: (chain) => chain.toggleTaskList() },
    ],
];
const NAMES = [...GROUPS.flat().map((item) => item.name), 'link'];

/** Toolbar of the description editor (MarkdownEditor). */
export default function MarkdownToolbar({ editor, t }) {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
    const size = isSmallScreen ? 'small' : 'medium';
    const iconSize = isSmallScreen ? 18 : 20;
    const active = useEditorState({
        editor,
        selector: ({ editor: current }) => Object.fromEntries(NAMES.map((name) => [name, current.isActive(name)])),
    });
    const label = (key, fallback) => t?.(`categories.richTextEditor.${key}`) || fallback;

    // A link only with http, https or mailto (spec 5); an empty answer removes the link.
    const editLink = () => {
        const url = window.prompt(label('enterUrl', 'Enter URL:'), 'https://');
        if (url === null) return;
        const href = url.trim();
        const chain = editor.chain().focus().extendMarkRange('link');
        if (href === '') chain.unsetLink().run();
        else if (SAFE_LINK.test(href)) chain.setLink({ href }).run();
    };

    const button = (name, title, Icon, onClick) => (
        <Tooltip key={name} title={title}>
            <IconButton
                size={size}
                aria-label={title}
                onClick={onClick}
                sx={{ color: active[name] ? 'primary.main' : 'inherit' }}
            >
                <Icon sx={{ fontSize: iconSize }} />
            </IconButton>
        </Tooltip>
    );

    return (
        <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5,
            p: 1,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'action.hover',
        }}>
            {GROUPS.map((group, index) => (
                <React.Fragment key={index}>
                    {group.map(({ name, labelKey, fallback, Icon, run }) => button(
                        name, label(labelKey, fallback), Icon, () => run(editor.chain().focus()).run(),
                    ))}
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                </React.Fragment>
            ))}
            {button('link', label('link', 'Link'), LinkIcon, editLink)}
        </Box>
    );
}
