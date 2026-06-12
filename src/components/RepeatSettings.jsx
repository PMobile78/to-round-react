import React from 'react';
import { Box, FormControlLabel, Switch, MenuItem, Select, InputLabel, FormControl, TextField, Button, Typography } from '@mui/material';

export default function RepeatSettings({ value, onChange, t, disabled = false, isMobile = false }) {
    const hasRepeat = !!value;
    const [enabled, setEnabled] = React.useState(hasRepeat);
    const [unit, setUnit] = React.useState(value?.unit || 'days');
    const [every, setEvery] = React.useState(value?.every || 1);
    const [selectedDays, setSelectedDays] = React.useState(value?.weekDays || []);
    const prevValueRef = React.useRef();

    // Update state when value prop changes
    React.useEffect(() => {
        // Prevent unnecessary updates if value hasn't actually changed
        if (JSON.stringify(prevValueRef.current) === JSON.stringify(value)) {
            return;
        }

        prevValueRef.current = value;

        if (value) {
            setEnabled(true);
            setUnit(value.unit || 'days');
            setEvery(value.every || 1);
            setSelectedDays(value.weekDays || []);
        } else {
            setEnabled(false);
            setUnit('days');
            setEvery(1);
            setSelectedDays([]);
        }
    }, [value]);

    // If parent disables control (no due date) — force disable and clear
    React.useEffect(() => {
        if (disabled) {
            if (enabled) setEnabled(false);
            onChange(null);
        }
        // eslint-disable-next-line
    }, [disabled]);

    // Update repeat data when state changes
    React.useEffect(() => {
        if (!enabled || disabled) {
            onChange(null);
            return;
        }

        const repeatData = { every: Number(every) || 1, unit };

        // Add weekDays if unit is weeks
        if (unit === 'weeks' && selectedDays.length > 0) {
            repeatData.weekDays = selectedDays;
        }

        onChange(repeatData);
        // eslint-disable-next-line
    }, [enabled, disabled, every, unit, selectedDays]);

    const weekDays = [
        { key: 'monday', value: 1 },
        { key: 'tuesday', value: 2 },
        { key: 'wednesday', value: 3 },
        { key: 'thursday', value: 4 },
        { key: 'friday', value: 5 },
        { key: 'saturday', value: 6 },
        { key: 'sunday', value: 0 }
    ];

    const handleDayToggle = (dayValue) => {
        setSelectedDays(prev => {
            if (prev.includes(dayValue)) {
                return prev.filter(d => d !== dayValue);
            } else {
                return [...prev, dayValue];
            }
        });
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
                control={<Switch checked={enabled && !disabled} onChange={(e) => setEnabled(e.target.checked)} disabled={disabled} />}
                label={t ? t('bubbles.repeatEvery') : 'Repeat every'}
            />
            <Box sx={{ display: 'flex', gap: 2, width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
                <TextField
                    type="number"
                    label={t ? t('bubbles.every') : 'Every'}
                    value={every}
                    onChange={(e) => setEvery(e.target.value)}
                    inputProps={{ min: 1 }}
                    sx={{ width: isMobile ? '100%' : 120 }}
                    disabled={!enabled || disabled}
                />
                <FormControl sx={{ minWidth: isMobile ? '100%' : 160 }} disabled={!enabled || disabled}>
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

            {/* Week days selection for weekly repeat */}
            {enabled && unit === 'weeks' && !disabled && (
                <Box sx={{ width: '100%', mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                        {t ? t('bubbles.selectWeekDays') : 'Select days of the week'}
                    </Typography>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 1,
                        maxWidth: 300
                    }}>
                        {weekDays.map((day) => (
                            <Button
                                key={day.key}
                                variant={selectedDays.includes(day.value) ? "contained" : "outlined"}
                                size="small"
                                onClick={() => handleDayToggle(day.value)}
                                sx={{
                                    minWidth: 'auto',
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    fontSize: '0.55rem',
                                    fontWeight: 'bold',
                                    textTransform: 'none',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: selectedDays.includes(day.value) ? 'none' : '1px solid',
                                    borderColor: 'divider',
                                    backgroundColor: selectedDays.includes(day.value)
                                        ? 'rgba(25, 118, 210, 0.12)'
                                        : 'transparent',
                                    color: selectedDays.includes(day.value)
                                        ? 'primary.main'
                                        : 'text.secondary',
                                    '&:hover': {
                                        backgroundColor: selectedDays.includes(day.value)
                                            ? 'rgba(25, 118, 210, 0.2)'
                                            : 'action.hover'
                                    }
                                }}
                            >
                                {t ? t(`bubbles.weekDays.${day.key}`) : day.key.toUpperCase().substring(0, 3)}
                            </Button>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    );
}


