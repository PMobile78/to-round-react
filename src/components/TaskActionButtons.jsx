import React from 'react';
import { Box, IconButton } from '@mui/material';
import {
    CheckCircle,
    DeleteOutlined,
    DoneAll,
    Edit,
    Restore,
} from '@mui/icons-material';
import { BUBBLE_STATUS, canFinishSeries } from '../utils/bubbleStatus';

// Action matrix: define which actions appear for each status
// ("finishSeries" only for a repeating task, see canFinishSeries)
const ACTIONS = {
    [BUBBLE_STATUS.ACTIVE]: ['edit', 'done', 'finishSeries', 'delete'],
    [BUBBLE_STATUS.DONE]: ['edit', 'restore', 'delete'],
    [BUBBLE_STATUS.DELETED]: ['edit', 'restore', 'permanentDelete'],
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
    finishSeries: {
        icon: DoneAll,
        color: 'success.main',
        titleKey: 'bubbles.finishSeries',
        handler: 'onFinishSeries',
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
    onFinishSeries,
    onDelete,
    onRestore,
    onPermanentDelete,
}) => {
    const actions = (ACTIONS[task.status] || []).filter((action) => action !== 'finishSeries' || canFinishSeries(task));
    const handlers = {
        onEdit,
        onMarkDone,
        onFinishSeries,
        onDelete,
        onRestore,
        onPermanentDelete,
    };

    const renderButton = (actionKey) => {
        const metadata = ACTION_METADATA[actionKey];
        if (!metadata) return null;

        const Icon = metadata.icon;
        const handler = handlers[metadata.handler];

        const onClick = actionKey === 'edit'
            ? () => handler(task)
            : () => handler(task.id);

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
