import React from 'react';
import { Box, IconButton } from '@mui/material';
import {
    CheckCircle,
    DeleteOutlined,
    Edit,
    Restore,
} from '@mui/icons-material';
import { BUBBLE_STATUS } from '../services/firestoreService';

// Action matrix: define which actions appear for each status
const ACTIONS = {
    [BUBBLE_STATUS.ACTIVE]: ['edit', 'done', 'delete'],
    [BUBBLE_STATUS.DONE]: ['edit', 'restore', 'delete'],
    [BUBBLE_STATUS.DELETED]: ['edit', 'restore', 'permanentDelete'],
    [BUBBLE_STATUS.POSTPONE]: ['edit', 'restore', 'delete'],
};

// Action metadata: icon, color, title, and handler mapping
const ACTION_METADATA = {
    edit: {
        icon: Edit,
        color: 'primary.main',
        titleKey: 'bubbles.editBubble',
        handler: 'onEdit',
    },
    done: {
        icon: CheckCircle,
        color: 'success.main',
        titleKey: 'bubbles.markAsDone',
        handler: 'onMarkDone',
    },
    delete: {
        icon: DeleteOutlined,
        color: 'error.main',
        titleKey: 'bubbles.deleteBubble',
        handler: 'onDelete',
    },
    restore: {
        icon: Restore,
        color: 'primary.main',
        titleKey: 'bubbles.restoreBubble',
        handler: 'onRestore',
    },
    permanentDelete: {
        icon: DeleteOutlined,
        color: 'error.main',
        titleKey: 'bubbles.permanentDelete',
        handler: 'onPermanentDelete',
    },
};

const TaskActionButtons = ({
    task,
    t,
    onEdit,
    onMarkDone,
    onDelete,
    onRestore,
    onPermanentDelete,
}) => {
    const actions = ACTIONS[task.status] || [];
    const handlers = {
        onEdit,
        onMarkDone,
        onDelete,
        onRestore,
        onPermanentDelete,
    };

    const renderButton = (actionKey) => {
        const metadata = ACTION_METADATA[actionKey];
        if (!metadata) return null;

        const Icon = metadata.icon;
        const handler = handlers[metadata.handler];

        const onClick = actionKey === 'done' || actionKey === 'delete' || actionKey === 'permanentDelete'
            ? () => handler(task.id)
            : () => handler(task);

        return (
            <IconButton
                key={actionKey}
                size="small"
                onClick={onClick}
                sx={{ color: metadata.color }}
                title={t(metadata.titleKey)}
            >
                <Icon />
            </IconButton>
        );
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
            {actions.map(renderButton)}
        </Box>
    );
};

export default TaskActionButtons;
