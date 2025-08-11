import React, { useState } from 'react';
import { Box, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Search } from '@mui/icons-material';
import SearchField from './SearchField';

/**
 * Адаптивный контрол поиска с мобильным UX:
 * - На широком экране (>= 1130px) показывает инлайн поле поиска
 * - На узком экране (< 1130px) и на мобильных показывает кнопку-лупу и выезжающее поле поиска
 */
export default function ResponsiveSearch({
    searchQuery,
    setSearchQuery,
    themeMode = 'light',
    placement = 'desktop', // 'desktop' | 'mobile'
    showInstructions = false,
    resultsCount,
    showResultsCount = true,
    categoriesPanelEnabled = false,
}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const isNarrowHeader = useMediaQuery('(max-width:1130px)');

    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpanded = () => {
        if (isExpanded) {
            setSearchQuery('');
            setIsExpanded(false);
        } else {
            setIsExpanded(true);
        }
    };

    const activeBg = themeMode === 'light' ? 'rgba(59, 125, 237, 0.25)' : 'rgba(255, 255, 255, 0.3)';
    const idleBg = themeMode === 'light' ? 'rgba(59, 125, 237, 0.15)' : 'rgba(255, 255, 255, 0.2)';

    const renderInlineField = () => (
        <Box sx={{ maxWidth: 320, minWidth: 200, position: 'relative' }}>
            <SearchField
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { height: 36 } }}
            />
            {showResultsCount && searchQuery?.trim() && (
                <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', mt: 0.5, display: 'block', textAlign: 'center', position: 'absolute', left: 0, right: 0, fontSize: '11px' }}
                >
                    {resultsCount}
                </Typography>
            )}
        </Box>
    );

    const topOffset = placement === 'mobile' ? (isSmallScreen ? 60 : 70) : 70;

    const renderOverlayField = () => (
        <Box sx={{
            position: 'fixed',
            top: topOffset,
            left: (!isMobile && categoriesPanelEnabled) ? 340 : 10,
            right: 10,
            zIndex: 1000,
        }}>
            <SearchField
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                size="small"
                autoFocus
                onBlur={() => {
                    setTimeout(() => {
                        if (!searchQuery.trim()) setIsExpanded(false);
                    }, 150);
                }}
                sx={{
                    backgroundColor: themeMode === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 30, 30, 0.95)',
                    backdropFilter: 'blur(10px)',
                }}
            />
            {showResultsCount && searchQuery?.trim() && (
                <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', mt: 0.5, display: 'block', textAlign: 'center', fontSize: '11px' }}
                >
                    {resultsCount}
                </Typography>
            )}
        </Box>
    );

    // Широкий экран: инлайн поле; узкий/мобайл: кнопка + оверлей
    const showInline = !isMobile && !isNarrowHeader;

    return (
        <>
            {showInline ? (
                renderInlineField()
            ) : (
                <>
                    <IconButton onClick={toggleExpanded} sx={{ backgroundColor: isExpanded ? activeBg : idleBg }}>
                        <Search />
                    </IconButton>
                    {isExpanded && renderOverlayField()}
                </>
            )}
        </>
    );
}


