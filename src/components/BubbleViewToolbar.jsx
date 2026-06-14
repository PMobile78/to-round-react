import React from 'react';
import { Box, Button, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CloseOutlined, FilterList, ViewList } from '@mui/icons-material';
import ResponsiveSearch from './ResponsiveSearch';

/**
 * Top-right toolbar for the bubbles view: search, list-view + filter buttons and
 * the click/drag instructions card. Extracted from BubblesPage (Task 6/6 of #38).
 * Desktop and mobile variants kept 1:1 — only the surrounding
 * `mainView === 'bubbles'` guard stays in BubblesPage.
 */
const BubbleViewToolbar = ({
    isMobile,
    isSmallScreen,
    t,
    themeMode,
    bubblesSearchQuery,
    setBubblesSearchQuery,
    searchFoundBubbles,
    showInstructions,
    categoriesPanelEnabled,
    setListViewDialog,
    setFilterDrawerOpen,
    isAllSelected,
    getOutlinedButtonStyles,
    getButtonStyles,
    handleCloseInstructions
}) => {
    const theme = useTheme();

    return !isMobile ? (
        <Box sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            alignItems: 'flex-end'
        }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Tooltip title={t('bubbles.searchPlaceholder')} placement="bottom">
                    <Box sx={{ display: 'inline-flex' }}>
                        <ResponsiveSearch
                            searchQuery={bubblesSearchQuery}
                            setSearchQuery={setBubblesSearchQuery}
                            themeMode={themeMode}
                            placement="desktop"
                            showInstructions={showInstructions}
                            resultsCount={t('bubbles.searchResults', { count: searchFoundBubbles.length })}
                            showResultsCount
                            categoriesPanelEnabled={categoriesPanelEnabled}
                        />
                    </Box>
                </Tooltip>

                {/* View Mode Toggle */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {/* Иконка поиска теперь инкапсулирована внутри ResponsiveSearch */}
                    <Tooltip title={t('bubbles.listView')} placement="bottom">
                        <span>
                            <Button
                                onClick={() => setListViewDialog(true)}
                                variant="outlined"
                                size="small"
                                startIcon={<ViewList />}
                                sx={{
                                    ...getOutlinedButtonStyles(),
                                    height: 36
                                }}
                            >
                                {t('bubbles.listView')}
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip
                        title={categoriesPanelEnabled ? t('bubbles.filterDisabled') : t('bubbles.filterButton')}
                        placement="top"
                    >
                        <span>
                            <Button
                                onClick={() => {
                                    if (!categoriesPanelEnabled) {
                                        setFilterDrawerOpen(true);
                                    }
                                }}
                                variant="outlined"
                                size="small"
                                startIcon={<FilterList />}
                                disabled={categoriesPanelEnabled}
                                sx={{
                                    ...getOutlinedButtonStyles(),
                                    height: 36,
                                    backgroundColor: alpha(
                                        theme.palette.primary.main,
                                        !isAllSelected()
                                            ? (themeMode === 'light' ? 0.15 : 0.2)
                                            : (themeMode === 'light' ? 0.08 : 0)
                                    ),
                                    opacity: categoriesPanelEnabled ? 0.5 : 1,
                                    '&:disabled': {
                                        backgroundColor: theme.palette.action.disabledBackground,
                                        color: theme.palette.action.disabled
                                    }
                                }}
                            >
                                {t('bubbles.filterButton')}
                            </Button>
                        </span>
                    </Tooltip>
                </Box>



            </Box>
            {/* Оверлей поиска для узких/мобильных в компоненте ResponsiveSearch не нужен отдельно */}

            {showInstructions && (
                <Box sx={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    padding: 2,
                    borderRadius: 2,
                    position: 'relative'
                }}>
                    <IconButton
                        onClick={handleCloseInstructions}
                        sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            color: 'white',
                            padding: 0.5,
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)'
                            }
                        }}
                        size="small"
                    >
                        <CloseOutlined fontSize="small" />
                    </IconButton>
                    <Typography variant="body2" sx={{ color: 'white', marginBottom: 1, paddingRight: 2 }}>
                        {t('bubbles.clickInstruction')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', paddingRight: 2 }}>
                        {t('bubbles.dragInstruction')}
                    </Typography>
                </Box>
            )}
        </Box>
    ) : (
        <>
            <Box sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 1000,
                display: 'flex',
                gap: 1,
                alignItems: 'center'
            }}>
                <Tooltip title={t('bubbles.searchPlaceholder')} placement="bottom-start">
                    <Box sx={{ display: 'inline-flex' }}>
                        <ResponsiveSearch
                            searchQuery={bubblesSearchQuery}
                            setSearchQuery={setBubblesSearchQuery}
                            themeMode={themeMode}
                            placement="mobile"
                            showInstructions={showInstructions}
                            resultsCount={t('bubbles.searchResults', { count: searchFoundBubbles.length })}
                            showResultsCount
                            categoriesPanelEnabled={categoriesPanelEnabled}
                        />
                    </Box>
                </Tooltip>

                {/* View Mode Toggle for Mobile */}
                <Tooltip title={t('bubbles.listView')} placement="bottom-start">
                    <span>
                        <IconButton
                            onClick={() => setListViewDialog(true)}
                            sx={getButtonStyles()}
                        >
                            <ViewList />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip
                    title={categoriesPanelEnabled ? t('bubbles.filterDisabled') : t('bubbles.filterButton')}
                    placement="top"
                >
                    <span>
                        <IconButton
                            onClick={() => {
                                if (!categoriesPanelEnabled) {
                                    setFilterDrawerOpen(true);
                                }
                            }}
                            disabled={categoriesPanelEnabled}
                            sx={{
                                ...getButtonStyles(),
                                backgroundColor: alpha(
                                    theme.palette.primary.main,
                                    !isAllSelected()
                                        ? (themeMode === 'light' ? 0.22 : 0.3)
                                        : (themeMode === 'light' ? 0.12 : 0.18)
                                ),
                                opacity: categoriesPanelEnabled ? 0.5 : 1,
                                '&:disabled': {
                                    backgroundColor: theme.palette.action.disabledBackground,
                                    color: theme.palette.action.disabled
                                }
                            }}
                        >
                            <FilterList />
                        </IconButton>
                    </span>
                </Tooltip>



            </Box>

            {/* Поле поиска для мобильной версии теперь инкапсулировано в ResponsiveSearch */}
            {showInstructions && (
                <Box sx={{
                    position: 'absolute',
                    top: isSmallScreen ? 60 : 70,
                    left: 10,
                    right: 10,
                    zIndex: 1000,
                    backgroundColor: alpha(theme.palette.background.paper, 0.55),
                    backdropFilter: 'blur(8px)',
                    padding: 1.5,
                    borderRadius: 3,
                    textAlign: 'center'
                }}>
                    <IconButton
                        onClick={handleCloseInstructions}
                        sx={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            color: theme.palette.text.primary,
                            padding: 0.5,
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.text.primary, 0.1)
                            }
                        }}
                        size="small"
                    >
                        <CloseOutlined fontSize="small" />
                    </IconButton>
                    <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontSize: 12, paddingRight: 3 }}>
                        {t('bubbles.mobileClickInstruction')}
                    </Typography>
                </Box>
            )}
        </>
    );
};

export default BubbleViewToolbar;
