import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    RadioGroup,
    FormControlLabel,
    Radio,
    TextField,
    Box,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    IconButton
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DeleteIcon from '@mui/icons-material/Delete';

const PRESETS = [
    { value: '5m', label: '5 minutes before' },
    { value: '10m', label: '10 minutes before' },
    { value: '15m', label: '15 minutes before' },
    { value: '1h', label: '1 hour before' },
    { value: '1d', label: '1 day before' },
    { value: 'custom', label: 'Custom...' }
];

const CUSTOM_UNITS = [
    { value: 'minutes', label: 'Minutes before' },
    { value: 'hours', label: 'Hours' },
    { value: 'days', label: 'Days' },
    { value: 'weeks', label: 'Weeks' }
];

function formatNotificationText(notification) {
    if (typeof notification === 'string') {
        // Preset
        const preset = PRESETS.find(p => p.value === notification);
        return preset ? preset.label : notification;
    }
    if (notification.type === 'custom') {
        const unit = CUSTOM_UNITS.find(u => u.value === notification.unit);
        return `${notification.value} ${unit ? unit.label : notification.unit}`;
    }
    return '';
}

export default function AddNotification({
    notifications = [],
    onAdd,
    onDelete,
    open,
    onClose,
    dueDate // <-- добавляем dueDate как проп
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selected, setSelected] = useState('5m');
    const [customOpen, setCustomOpen] = useState(false);
    const [customValue, setCustomValue] = useState('');
    const [customUnit, setCustomUnit] = useState('minutes');

    // Вспомогательная функция для вычисления offset в миллисекундах
    function getOffsetMs(notification) {
        if (typeof notification === 'string') {
            if (notification.endsWith('m')) return parseInt(notification) * 60 * 1000;
            if (notification.endsWith('h')) return parseInt(notification) * 60 * 60 * 1000;
            if (notification.endsWith('d')) return parseInt(notification) * 24 * 60 * 60 * 1000;
        }
        if (notification.type === 'custom') {
            const v = Number(notification.value);
            switch (notification.unit) {
                case 'minutes': return v * 60 * 1000;
                case 'hours': return v * 60 * 60 * 1000;
                case 'days': return v * 24 * 60 * 60 * 1000;
                case 'weeks': return v * 7 * 24 * 60 * 60 * 1000;
                default: return 0;
            }
        }
        return 0;
    }

    // Проверка просроченности уведомления
    function isNotificationOverdue(notification) {
        if (!dueDate) return false;
        const due = new Date(dueDate).getTime();
        const offset = getOffsetMs(notification);
        const notifTime = due - offset;
        return Date.now() > notifTime;
    }

    const handleRadioChange = (e) => {
        setSelected(e.target.value);
        if (e.target.value === 'custom') {
            setCustomOpen(true);
        } else {
            setCustomOpen(false);
        }
    };

    const handleCustomSave = () => {
        if (customValue && !isNaN(Number(customValue)) && Number(customValue) > 0) {
            onAdd({ type: 'custom', value: Number(customValue), unit: customUnit });
            setCustomOpen(false);
            setDialogOpen(false);
        }
    };

    const handleSave = () => {
        if (selected !== 'custom') {
            onAdd(selected);
            setDialogOpen(false);
        } else {
            setCustomOpen(true);
        }
    };

    return (
        <Box>
            {/* Список уведомлений */}
            <List dense>
                {notifications.map((notif, idx) => (
                    <ListItem key={idx} secondaryAction={
                        <IconButton edge="end" aria-label="delete" onClick={() => onDelete(idx)}>
                            <DeleteIcon />
                        </IconButton>
                    }>
                        <ListItemIcon>
                            <NotificationsActiveIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                            primary={formatNotificationText(notif)}
                            primaryTypographyProps={isNotificationOverdue(notif) ? { sx: { textDecoration: 'line-through', color: '#b0b0b0' } } : {}}
                        />
                    </ListItem>
                ))}
            </List>
            {/* Кнопка добавления */}
            <Button variant="outlined" onClick={() => setDialogOpen(true)} sx={{ mt: 0, mb: 2 }}>
                Add notification
            </Button>

            {/* Диалог выбора уведомления */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
                <DialogTitle>Add notification</DialogTitle>
                <DialogContent>
                    <RadioGroup value={selected} onChange={handleRadioChange}>
                        {PRESETS.map(opt => (
                            <FormControlLabel key={opt.value} value={opt.value} control={<Radio />} label={opt.label} />
                        ))}
                    </RadioGroup>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>

            {/* Диалог custom-уведомления */}
            <Dialog open={customOpen} onClose={() => setCustomOpen(false)}>
                <DialogTitle>Custom notification</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                        <TextField
                            label="Value"
                            type="number"
                            value={customValue}
                            onChange={e => setCustomValue(e.target.value)}
                            inputProps={{ min: 1 }}
                            sx={{ width: 100 }}
                        />
                        <RadioGroup
                            row
                            value={customUnit}
                            onChange={e => setCustomUnit(e.target.value)}
                        >
                            {CUSTOM_UNITS.map(opt => (
                                <FormControlLabel key={opt.value} value={opt.value} control={<Radio />} label={opt.label} />
                            ))}
                        </RadioGroup>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCustomOpen(false)}>Cancel</Button>
                    <Button onClick={handleCustomSave} variant="contained" disabled={!customValue || isNaN(Number(customValue)) || Number(customValue) <= 0}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
} 