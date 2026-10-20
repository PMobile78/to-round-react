import React, { useEffect, useState } from 'react';
import { Box, Button, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Switch, TextField, Typography } from '@mui/material';
import { LIMITS, REPEAT_UNITS } from '../contract/schema';

// ISO weekdays (spec 4.3): 1 = Monday … 7 = Sunday, the week starts on Monday.
const WEEKDAYS = [
    { key: 'monday', value: 1 },
    { key: 'tuesday', value: 2 },
    { key: 'wednesday', value: 3 },
    { key: 'thursday', value: 4 },
    { key: 'friday', value: 5 },
    { key: 'saturday', value: 6 },
    { key: 'sunday', value: 7 },
];

/**
 * Repeat of a task (spec 3.1): every 1–999 hours, days, weeks or months; a weekly repeat may name
 * its weekdays. value is the repeat or null; onChange gets { ...value, every, unit, weekdays }.
 * The month day of a monthly repeat is not edited here: taskForm.js takes it from the due.
 * disabled (no due) turns the repeat off and locks the editor.
 */
export default function RepeatEditor({ value, onChange, t, disabled = false, isMobile = false }) {
    const enabled = value !== null && !disabled;
    // The number as typed; only a whole number from 1 to 999 reaches onChange.
    const [everyText, setEveryText] = useState(String(value?.every ?? 1));
    useEffect(() => {
        setEveryText(String(value?.every ?? 1));
    }, [value?.every]);

    const changeEvery = (text) => {
        setEveryText(text);
        const every = text === '' ? NaN : Number(text);
        if (Number.isInteger(every) && every >= 1 && every <= LIMITS.repeatEveryMax) onChange({ ...value, every });
    };
    const toggleDay = (day) => {
        const days = value.weekdays || [];
        onChange({ ...value, weekdays: days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b) });
    };

    return (
        <Box
            sx={{
                mt: 1,
                mb: 4,
                display: 'flex',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: 2,
                flexWrap: 'wrap',
                flexDirection: isMobile ? 'column' : 'row',
                width: '100%'
            }}
        >
            <FormControlLabel
                control={(
                    <Switch
                        checked={enabled}
                        onChange={(e) => onChange(e.target.checked ? { every: 1, unit: 'days' } : null)}
                        disabled={disabled}
                    />
                )}
                label={t('bubbles.repeatEvery')}
            />
            <Box sx={{ display: 'flex', gap: 2, width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
                <TextField
                    type="number"
                    label={t('bubbles.every')}
                    value={everyText}
                    onChange={(e) => changeEvery(e.target.value)}
                    onBlur={() => setEveryText(String(value?.every ?? 1))}
                    inputProps={{ min: 1, max: LIMITS.repeatEveryMax }}
                    sx={{ width: isMobile ? '100%' : 120 }}
                    disabled={!enabled}
                />
                <FormControl sx={{ minWidth: isMobile ? '100%' : 160 }} disabled={!enabled}>
                    <InputLabel>{t('bubbles.unit')}</InputLabel>
                    <Select value={value?.unit ?? 'days'} label={t('bubbles.unit')} onChange={(e) => onChange({ ...value, unit: e.target.value })}>
                        {REPEAT_UNITS.map((unit) => (
                            <MenuItem key={unit} value={unit}>{t(`bubbles.${unit}`)}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {enabled && value.unit === 'weeks' && (
                <Box sx={{ width: '100%', mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                        {t('bubbles.selectWeekDays')}
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, maxWidth: 300 }}>
                        {WEEKDAYS.map((day) => {
                            const selected = (value.weekdays || []).includes(day.value);
                            return (
                                <Button
                                    key={day.key}
                                    variant={selected ? 'contained' : 'outlined'}
                                    size="small"
                                    onClick={() => toggleDay(day.value)}
                                    sx={{
                                        minWidth: 'auto',
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        fontSize: '0.55rem',
                                        fontWeight: 'bold',
                                        textTransform: 'none',
                                        padding: 0,
                                    }}
                                >
                                    {t(`bubbles.weekDays.${day.key}`)}
                                </Button>
                            );
                        })}
                    </Box>
                </Box>
            )}
        </Box>
    );
}
