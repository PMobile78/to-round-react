import React from 'react';
import { Box } from '@mui/material';

/**
 * PlainTextEditor — plain textarea mode for basic text editing.
 */
function PlainTextEditor({
    value = '',
    onChange,
    placeholder = 'Введите описание...',
    isMobile = false,
    themeMode = 'light',
    t // unused, but present in the interface for consistency
}) {
    return (
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
}

export default PlainTextEditor;
