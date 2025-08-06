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
import { useTranslation } from 'react-i18next';

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

function formatNotificationText(notification, getPresets, getCustomUnits) {
    if (typeof notification === 'string') {
        // Preset
        const preset = getPresets().find(p => p.value === notification);
        return preset ? preset.label : notification;
    }
    if (notification.type === 'custom') {
        const unit = getCustomUnits().find(u => u.value === notification.unit);
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
    const { t } = useTranslation();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selected, setSelected] = useState('');
    const [customOpen, setCustomOpen] = useState(false);
    const [customValue, setCustomValue] = useState('');
    const [customUnit, setCustomUnit] = useState('minutes');

    // Получаем переведенные константы
    const getPresets = () => [
        { value: '5m', label: '5 minutes before' },
        { value: '10m', label: '10 minutes before' },
        { value: '15m', label: '15 minutes before' },
        { value: '1h', label: '1 hour before' },
        { value: '1d', label: '1 day before' },
        { value: 'custom', label: 'Custom...' }
    ];

    const getCustomUnits = () => [
        { value: 'minutes', label: t('bubbles.minutesBefore') },
        { value: 'hours', label: t('bubbles.hours') },
        { value: 'days', label: t('bubbles.days') },
        { value: 'weeks', label: t('bubbles.weeks') }
    ];

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

    // Сортировка уведомлений по времени до события (offset)
    const sortedNotifications = [...notifications].sort((a, b) => getOffsetMs(a) - getOffsetMs(b));

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
            // Проверяем, есть ли уже такой кастомный notification
            const exists = notifications.some(n =>
                typeof n === 'object' && n.type === 'custom' &&
                Number(n.value) === Number(customValue) && n.unit === customUnit
            );
            if (!exists) {
                // Добавляем и сортируем
                const newNotifs = [...notifications, { type: 'custom', value: Number(customValue), unit: customUnit }];
                newNotifs.sort((a, b) => getOffsetMs(a) - getOffsetMs(b));
                onAdd(newNotifs);
            }
            setCustomOpen(false);
            setDialogOpen(false);
            setSelected(''); // сброс выбора
        }
    };

    const handleSave = () => {
        if (!selected) return; // Не добавлять, если ничего не выбрано
        if (selected !== 'custom') {
            // Проверяем, есть ли уже такой notification
            if (!notifications.some(n => typeof n === 'string' ? n === selected : false)) {
                // Добавляем и сортируем
                const newNotifs = [...notifications, selected];
                newNotifs.sort((a, b) => getOffsetMs(a) - getOffsetMs(b));
                onAdd(newNotifs);
            }
            setDialogOpen(false);
            setSelected(''); // сброс выбора
        } else {
            setCustomOpen(true);
        }
    };

    return (
        <Box>
            {/* Список уведомлений */}
            <List dense>
                {sortedNotifications.map((notif, idx) => (
                    <ListItem key={idx} secondaryAction={
                        <IconButton edge="end" aria-label="delete" onClick={() => onDelete(idx)}>
                            <DeleteIcon />
                        </IconButton>
                    }>
                        <ListItemIcon>
                            <NotificationsActiveIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                            primary={formatNotificationText(notif, getPresets, getCustomUnits)}
                            primaryTypographyProps={isNotificationOverdue(notif) ? { sx: { textDecoration: 'line-through', color: '#b0b0b0' } } : {}}
                        />
                    </ListItem>
                ))}
            </List>
            {/* Кнопка добавления */}
            <Button variant="outlined" onClick={() => setDialogOpen(true)} sx={{ mt: 0, mb: 2 }}>
                {t('bubbles.remindMe')}
            </Button>

            {/* Диалог выбора уведомления */}
            <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setSelected(''); }}>
                <DialogTitle>{t('bubbles.addNotification')}</DialogTitle>
                <DialogContent>
                    <RadioGroup value={selected} onChange={handleRadioChange}>
                        {getPresets().map(opt => (
                            <FormControlLabel
                                key={opt.value}
                                value={opt.value}
                                control={<Radio />}
                                label={opt.label}
                                disabled={notifications.some(n => typeof n === 'string' ? n === opt.value : false)}
                            />
                        ))}
                    </RadioGroup>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setDialogOpen(false); setSelected(''); }}>{t('bubbles.cancel')}</Button>
                    <Button onClick={handleSave} variant="contained">{t('bubbles.save')}</Button>
                </DialogActions>
            </Dialog>

            {/* Диалог custom-уведомления */}
            <Dialog open={customOpen} onClose={() => { setCustomOpen(false); setSelected(''); }}>
                <DialogTitle>{t('bubbles.customNotification')}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                        <TextField
                            label={t('bubbles.value')}
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
                            {getCustomUnits().map(opt => (
                                <FormControlLabel key={opt.value} value={opt.value} control={<Radio />} label={opt.label} />
                            ))}
                        </RadioGroup>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setCustomOpen(false); setSelected(''); }}>{t('bubbles.cancel')}</Button>
                    <Button onClick={handleCustomSave} variant="contained" disabled={!customValue || isNaN(Number(customValue)) || Number(customValue) <= 0}>{t('bubbles.save')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
} 