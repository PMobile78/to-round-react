import React from 'react';
import { Box, IconButton, Button, Tooltip } from '@mui/material';
import { Menu as MenuIcon, Add, Refresh } from '@mui/icons-material';

/**
 * Top-left header for the bubbles view: menu button, logo and "add bubble"
 * (desktop) / menu + reload (mobile). Extracted from BubblesPage (Task 6/6 of
 * #38). Kept 1:1; the surrounding `mainView === 'bubbles'` guard stays in
 * BubblesPage.
 */
const BubbleViewHeader = ({
    isMobile,
    categoriesPanelEnabled,
    t,
    getButtonStyles,
    onOpenMenu,
    onAddBubble
}) => {
    return !isMobile ? (
        <>
            <Box sx={{
                position: 'absolute',
                top: 20,
                left: (!isMobile && categoriesPanelEnabled) ? 20 : 20,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'left 0.3s ease'
            }}>
                <IconButton
                    onClick={() => onOpenMenu(true)}
                    sx={{
                        ...getButtonStyles(),
                        marginRight: 1
                    }}
                >
                    <MenuIcon />
                </IconButton>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}>
                    <img
                        src={`${import.meta.env.BASE_URL}bubbles.png`}
                        alt="Bubbles"
                        style={{
                            width: '32px',
                            height: '32px',
                            objectFit: 'contain'
                        }}
                    />
                    {/* <Typography variant="h4" sx={{
                        color: themeMode === 'light' ? '#2C3E50' : 'white',
                        fontWeight: 'bold'
                    }}>
                        {t('bubbles.title')}
                    </Typography> */}
                </Box>
                <Button
                    variant="contained"
                    onClick={onAddBubble}
                    startIcon={<Add />}
                    sx={{ height: 36 }}
                >
                    {t('bubbles.addBubble')}
                </Button>
                {/* <Button
                    variant="contained"
                    onClick={openCreateDialog}
                    sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.3)'
                        }
                    }}
                >
                    {t('bubbles.addBubble')}
                </Button> */}
            </Box>
        </>
    ) : (
        // Mobile version without category selector
        <Box sx={{
            position: 'absolute',
            top: 10,
            left: 0,
            right: 0,
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            padding: '0 10px',
            gap: 1
        }}>
            <IconButton
                onClick={() => onOpenMenu(true)}
                sx={getButtonStyles()}
            >
                <MenuIcon />
            </IconButton>
            <Tooltip title={t('bubbles.reload')}>
                <IconButton
                    onClick={() => window.location.reload()}
                    sx={{ ...getButtonStyles(), ml: 1 }}
                >
                    <Refresh />
                </IconButton>
            </Tooltip>
        </Box>
    );
};

export default BubbleViewHeader;
