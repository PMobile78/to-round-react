import React from 'react';
import { Box, Fab, Tooltip } from '@mui/material';
import { Add } from '@mui/icons-material';

/**
 * Draggable floating "add bubble" button for mobile. Extracted from BubblesPage
 * (Task 6/6 of #38). Kept 1:1; the surrounding
 * `mainView === 'bubbles' && isMobile` guard stays in BubblesPage.
 */
const BubbleViewFab = ({
    t,
    fabRef,
    onFabPointerDown,
    fabPosition,
    getDefaultFabPosition,
    isDraggingFab,
    suppressNextClickRef,
    onAddBubble
}) => {
    return (
        <>
            <Box
                ref={fabRef}
                onPointerDown={onFabPointerDown}
                sx={{
                    position: 'fixed',
                    left: (fabPosition?.x ?? getDefaultFabPosition().x),
                    top: (fabPosition?.y ?? getDefaultFabPosition().y),
                    zIndex: 1000,
                    cursor: isDraggingFab ? 'grabbing' : 'grab',
                    touchAction: 'none',
                }}
            >
                <Tooltip title={t('bubbles.addBubble')}>
                    <Fab
                        color="primary"
                        onClick={(e) => {
                            if (suppressNextClickRef.current) {
                                suppressNextClickRef.current = false;
                                e.preventDefault();
                                e.stopPropagation();
                                return;
                            }
                            onAddBubble();
                        }}
                    >
                        <Add />
                    </Fab>
                </Tooltip>
            </Box>
            {/* <Tooltip title={t('bubbles.clearAll')}>
                <Fab
                    color="secondary"
                    onClick={clearAllBubbles}
                    size="medium"
                    sx={{
                        position: 'absolute',
                        bottom: 100, // Увеличен отступ для навигационной панели
                        left: 20,
                        zIndex: 1000,
                        backgroundColor: 'rgba(255, 87, 87, 0.9)',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 87, 87, 1)'
                        }
                    }}
                >
                    <Clear />
                </Fab>
            </Tooltip> */}

        </>
    );
};

export default BubbleViewFab;
