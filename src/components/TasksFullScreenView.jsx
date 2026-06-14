import React from 'react';
import { Box, Button, IconButton, Typography, Paper } from '@mui/material';
import { Menu as MenuIcon, Add } from '@mui/icons-material';
import TaskList from './TaskList';

/**
 * Full-screen task-list view (canvas stays mounted underneath). Extracted from
 * BubblesPage (Task 6/6 of #38). Kept 1:1; the `mainView === 'tasks'` guard
 * stays in BubblesPage. The standalone panel is a <Paper> with no explicit
 * background (theme-driven), per CLAUDE.md conventions.
 */
const TasksFullScreenView = ({ t, onOpenMenu, onAddBubble, taskListProps }) => {
    return (
        <Paper elevation={16} square sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                padding: '12px 16px',
                color: 'text.primary',
                flexShrink: 0
            }}>
                <IconButton onClick={() => onOpenMenu(true)} sx={{ color: 'text.primary' }}>
                    <MenuIcon />
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
                    {t('bubbles.listView')}
                </Typography>
                <Button
                    variant="contained"
                    onClick={onAddBubble}
                    startIcon={<Add />}
                >
                    {t('bubbles.addBubble')}
                </Button>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <TaskList {...taskListProps} />
            </Box>
        </Paper>
    );
};

export default TasksFullScreenView;
