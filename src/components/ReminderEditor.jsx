import React, { useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    FormHelperText,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Radio,
    RadioGroup,
    TextField,
    Tooltip,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DeleteIcon from '@mui/icons-material/Delete';
import { LIMITS } from '../contract/schema';
import { REMINDER_PRESETS, reminderMinutes, reminderParts, withReminder } from '../utils/reminders';

const CUSTOM = 'custom';
const CUSTOM_UNITS = ['hours', 'days', 'weeks'];
const MINUTE_MS = 60 * 1000;

/**
 * Reminders of a task (spec 3.1): reminders are minutes before the due; the user adds 1 hour,
 * 1 day or a number of hours, days or weeks of their own. due (Date | null) is the date picker's
 * value: without it nothing can be added, and reminders whose moment has passed are struck through.
 */
export default function ReminderEditor({ reminders, onChange, due, t }) {
    const [open, setOpen] = useState(false);
    const [choice, setChoice] = useState('');
    const [count, setCount] = useState('');
    const [unit, setUnit] = useState('hours');

    const label = (minutes) => {
        const parts = reminderParts(minutes);
        return t(`bubbles.reminderBefore.${parts.unit}`, { count: parts.count });
    };
    const passed = (minutes) => due !== null && Date.now() > due.getTime() - minutes * MINUTE_MS;
    const full = reminders.length >= LIMITS.maxReminders;
    const chosen = choice === CUSTOM ? reminderMinutes(count, unit) : Number(choice) || null;

    const close = () => {
        setOpen(false);
        setChoice('');
        setCount('');
    };
    const save = () => {
        onChange(withReminder(reminders, chosen));
        close();
    };

    return (
        <Box>
            <List dense>
                {reminders.map((minutes) => (
                    <ListItem key={minutes} secondaryAction={
                        <IconButton edge="end" aria-label="delete" onClick={() => onChange(reminders.filter((m) => m !== minutes))}>
                            <DeleteIcon />
                        </IconButton>
                    }>
                        <ListItemIcon>
                            <NotificationsActiveIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                            primary={label(minutes)}
                            primaryTypographyProps={passed(minutes) ? { sx: { textDecoration: 'line-through', color: 'text.disabled' } } : {}}
                        />
                    </ListItem>
                ))}
            </List>
            <Tooltip title={!due ? t('bubbles.remindMeDisabled') : full ? t('bubbles.remindersMax') : t('bubbles.remindMe')} placement="top">
                <span>
                    <Button variant="outlined" onClick={() => setOpen(true)} disabled={!due || full} sx={{ mt: 0, mb: 2 }}>
                        {t('bubbles.remindMe')}
                    </Button>
                </span>
            </Tooltip>

            <Dialog open={open} onClose={close}>
                <DialogTitle>{t('bubbles.addNotification')}</DialogTitle>
                <DialogContent>
                    <RadioGroup value={choice} onChange={(e) => setChoice(e.target.value)}>
                        {REMINDER_PRESETS.map((minutes) => (
                            <FormControlLabel
                                key={minutes}
                                value={String(minutes)}
                                control={<Radio />}
                                label={label(minutes)}
                                disabled={reminders.includes(minutes)}
                            />
                        ))}
                        <FormControlLabel value={CUSTOM} control={<Radio />} label={t('bubbles.custom')} />
                    </RadioGroup>
                    {choice === CUSTOM && (
                        <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                <TextField
                                    label={t('bubbles.value')}
                                    type="number"
                                    value={count}
                                    onChange={(e) => setCount(e.target.value)}
                                    inputProps={{ min: 1 }}
                                    sx={{ width: 100 }}
                                />
                                <RadioGroup row value={unit} onChange={(e) => setUnit(e.target.value)}>
                                    {CUSTOM_UNITS.map((u) => (
                                        <FormControlLabel key={u} value={u} control={<Radio />} label={t(`bubbles.${u}`)} />
                                    ))}
                                </RadioGroup>
                            </Box>
                            <FormHelperText>{t('bubbles.reminderRange')}</FormHelperText>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={close}>{t('bubbles.cancel')}</Button>
                    <Button onClick={save} variant="contained" disabled={chosen === null || reminders.includes(chosen)}>
                        {t('bubbles.save')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
