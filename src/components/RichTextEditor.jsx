import React from 'react';
import {
    Box,
    Switch,
    FormControlLabel,
    Typography
} from '@mui/material';
import {
    TextFields,
    Code
} from '@mui/icons-material';
import TipTapRichEditor from './TipTapRichEditor';
import PlainTextEditor from './PlainTextEditor';
import { htmlToPlainText, plainToRichHtml } from '../utils/richTextFormatters';

/**
 * RichTextEditor — dispatcher component that switches between rich (TipTap) and plain (textarea) modes.
 *
 * Responsibilities:
 * - Toggle UI between rich and plain text modes
 * - Handle mode conversion (HTML ↔ plain text)
 * - Route to the appropriate editor component
 */
export default function RichTextEditor({
    value = '',
    onChange,
    placeholder = 'Введите описание...',
    isMobile = false,
    themeMode = 'light',
    useRichText = false,
    onToggleRichText,
    t
}) {
    const handleEditorModeChange = React.useCallback((event) => {
        const rich = event.target.checked;
        if (!rich) {
            onChange(htmlToPlainText(value));
        } else {
            const html = plainToRichHtml(value);
            if (html !== value) onChange(html);
        }
        onToggleRichText?.(rich);
    }, [value, onChange, onToggleRichText]);

    return (
        <Box>
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                gap: 1,
                marginBottom: 1,
                padding: 1,
                borderRadius: 1,
                backgroundColor: themeMode === 'light' ? '#f8f9fa' : '#2a2a2a',
                border: `1px solid ${themeMode === 'light' ? '#e0e0e0' : '#444'}`
            }}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={!!useRichText}
                            onChange={handleEditorModeChange}
                            size="small"
                        />
                    }
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {useRichText ? <TextFields sx={{ fontSize: 18 }} /> : <Code sx={{ fontSize: 18 }} />}
                            <Typography component="span" variant="body2">
                                {useRichText ? (t?.('bubbles.richTextMode') || 'Rich Text') : (t?.('bubbles.plainTextMode') || 'Plain Text')}
                            </Typography>
                        </Box>
                    }
                    labelPlacement="start"
                    sx={{
                        mr: 0,
                        ml: 0,
                        gap: 0.5,
                        '& .MuiFormControlLabel-label': {
                            ml: '0 !important'
                        }
                    }}
                />
            </Box>
            {useRichText ? (
                <TipTapRichEditor
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    isMobile={isMobile}
                    themeMode={themeMode}
                    t={t}
                />
            ) : (
                <PlainTextEditor
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    isMobile={isMobile}
                    themeMode={themeMode}
                    t={t}
                />
            )}
        </Box>
    );
}
