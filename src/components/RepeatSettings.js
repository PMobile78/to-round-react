import React from 'react';
import { Box, FormControlLabel, Switch, MenuItem, Select, InputLabel, FormControl, TextField } from '@mui/material';

export default function RepeatSettings({ value, onChange, t, disabled = false }) {
    const hasRepeat = !!value;
    const [enabled, setEnabled] = React.useState(hasRepeat);
    const [unit, setUnit] = React.useState(value?.unit || 'days');
    const [every, setEvery] = React.useState(value?.every || 1);

    // If parent disables control (no due date) — force disable and clear
    React.useEffect(() => {
        if (disabled) {
            if (enabled) setEnabled(false);
            onChange(null);
        }
        // eslint-disable-next-line
    }, [disabled]);

    React.useEffect(() => {
        if (!enabled || disabled) {
            onChange(null);
            return;
        }
        onChange({ every: Number(every) || 1, unit });
        // eslint-disable-next-line
    }, [enabled, unit, every]);

    return (
        <Box sx={{ mt: 1, mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FormControlLabel
                control={<Switch checked={enabled && !disabled} onChange={(e) => setEnabled(e.target.checked)} disabled={disabled} />}
                label={t ? t('bubbles.repeatEvery') : 'Repeat every'}
            />
            <TextField
                type="number"
                label={t ? t('bubbles.every') : 'Every'}
                value={every}
                onChange={(e) => setEvery(e.target.value)}
                inputProps={{ min: 1 }}
                sx={{ width: 120 }}
                disabled={!enabled || disabled}
            />
            <FormControl sx={{ minWidth: 160 }} disabled={!enabled || disabled}>
                <InputLabel>{t ? t('bubbles.unit') : 'Unit'}</InputLabel>
                <Select value={unit} label={t ? t('bubbles.unit') : 'Unit'} onChange={(e) => setUnit(e.target.value)}>
                    <MenuItem value="minutes">{t ? t('bubbles.minutes') : 'Minutes'}</MenuItem>
                    <MenuItem value="hours">{t ? t('bubbles.hours') : 'Hours'}</MenuItem>
                    <MenuItem value="days">{t ? t('bubbles.days') : 'Days'}</MenuItem>
                    <MenuItem value="weeks">{t ? t('bubbles.weeks') : 'Weeks'}</MenuItem>
                    <MenuItem value="months">{t ? t('bubbles.months') : 'Months'}</MenuItem>
                </Select>
            </FormControl>
        </Box>
    );
}


