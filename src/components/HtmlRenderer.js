import React from 'react';
import { Box } from '@mui/material';

const HtmlRenderer = ({
    html,
    themeMode = 'light',
    isMobile = false,
    sx = {}
}) => {
    if (!html || html.trim() === '') {
        return null;
    }

    return (
        <Box
            sx={{
                fontSize: isMobile ? '14px' : '12px',
                lineHeight: '1.4',
                color: themeMode === 'light' ? 'text.secondary' : '#aaaaaa',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                hyphens: 'auto',
                '& p': {
                    margin: '0.5em 0',
                },
                '& ul, & ol': {
                    margin: '0.5em 0',
                    paddingLeft: '1.5em',
                },
                '& li': {
                    margin: '0.2em 0',
                },
                '& strong, & b': {
                    fontWeight: 'bold',
                },
                '& em, & i': {
                    fontStyle: 'italic',
                },
                '& u': {
                    textDecoration: 'underline',
                },
                '& s, & strike': {
                    textDecoration: 'line-through',
                },
                '& mark': {
                    backgroundColor: themeMode === 'light' ? '#fff3cd' : '#856404',
                    color: themeMode === 'light' ? '#856404' : '#fff3cd',
                    padding: '0.1em 0.2em',
                    borderRadius: '2px',
                },
                '& [style*="text-align: center"]': {
                    textAlign: 'center',
                },
                '& [style*="text-align: right"]': {
                    textAlign: 'right',
                },
                '& [style*="text-align: justify"]': {
                    textAlign: 'justify',
                },
                ...sx
            }}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};

export default HtmlRenderer;
