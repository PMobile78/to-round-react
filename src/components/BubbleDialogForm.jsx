import React from 'react';
import {
    TextField,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Slider,
    Button,
    IconButton,
    Typography
} from '@mui/material';
import { Clear } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import enUS from 'date-fns/locale/en-US';
import uk from 'date-fns/locale/uk';
import { lsSet } from '../utils/storage';
import { LS } from '../utils/storageKeys';
import i18n from '../i18n';
import AddNotification from './AddNotification';
import RepeatSettings from './RepeatSettings';
import RichTextEditor from './RichTextEditor';

export default function BubbleDialogForm(props) {
    const {
        t,
        isSmallScreen,
        isMobile,
        themeMode,
        title,
        setTitle,
        description,
        setDescription,
        useRichText,
        onToggleUseRichText,
        dueDate,
        setDueDate,
        isOverdue,
        notifDialogOpen,
        setNotifDialogOpen,
        notifValue,
        setNotifValue,
        notifications,
        setNotifications,
        handleDeleteNotification,
        recurrence,
        setRecurrence,
        tags,
        selectedTagId,
        setSelectedTagId,
        bubbleSize,
        setBubbleSize,
        showStopPulsing,
        onStopPulsing
    } = props;

    const currentLang = (typeof i18n.language === 'string' ? i18n.language : 'en') || 'en';
    const adapterLocale = currentLang.startsWith('uk') ? uk : enUS;

    return (
        <>
            <TextField
                autoFocus={!isMobile}
                margin="dense"
                label={t('bubbles.titleLabel')}
                fullWidth
                variant="outlined"
                multiline
                minRows={2}
                maxRows={4}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                sx={{
                    marginTop: 3,
                    '& .MuiInputBase-input': {
                        fontSize: isMobile ? 16 : 14,
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'pre-wrap'
                    }
                }}
            />
            <Box sx={{ marginTop: 2, marginBottom: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 1 }}>
                    {t('bubbles.descriptionLabel')}
                </Typography>
                <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder={t('bubbles.descriptionPlaceholder') || 'Введите описание...'}
                    isMobile={isMobile}
                    themeMode={themeMode}
                    useRichText={useRichText}
                    onToggleRichText={(enabled) => {
                        onToggleUseRichText?.(enabled);
                        try { lsSet(LS.USE_RICH_TEXT, enabled); } catch (_) { }
                    }}
                    t={t}
                />
            </Box>
            <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel>{t('bubbles.categoryLabel')}</InputLabel>
                <Select
                    value={selectedTagId}
                    onChange={(e) => setSelectedTagId(e.target.value)}
                    label={t('bubbles.categoryLabel')}
                    MenuProps={{
                        PaperProps: {
                            sx: { maxWidth: 350 }
                        }
                    }}
                    sx={{ '& .MuiSelect-select': { fontSize: isMobile ? 16 : 14 } }}
                >
                    <MenuItem value="">
                        <em>{t('bubbles.noCategory')}</em>
                    </MenuItem>
                    {tags.map(tag => (
                        <MenuItem key={tag.id} value={tag.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: tag.color, border: '1px solid #ccc', flexShrink: 0 }} />
                                <Typography sx={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tag.name}</Typography>
                            </Box>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <Box sx={{ marginTop: 1, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={adapterLocale}>
                        <DateTimePicker
                            label={t('bubbles.dueDateLabel')}
                            value={dueDate}
                            onChange={setDueDate}
                            ampm={false}
                            closeOnSelect={false}
                            views={["year", "month", "day", "hours", "minutes"]}
                            viewRenderers={{
                                hours: renderTimeViewClock,
                                minutes: renderTimeViewClock,
                                seconds: renderTimeViewClock,
                            }}
                            inputFormat={currentLang.startsWith('uk') ? "dd.MM.yyyy HH:mm" : "MM/dd/yyyy HH:mm"}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    fullWidth
                                    margin="dense"
                                    sx={{
                                        marginTop: 2,
                                        marginBottom: 2,
                                        '& .MuiInputBase-root': {
                                            borderColor: isOverdue(dueDate) ? '#f44336' : undefined,
                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                borderColor: isOverdue(dueDate) ? '#f44336' : undefined,
                                            },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                borderColor: isOverdue(dueDate) ? '#f44336' : undefined,
                                            }
                                        }
                                    }}
                                />
                            )}
                        />
                    </LocalizationProvider>
                </Box>
                {!isMobile && showStopPulsing ? (
                    <Button
                        onClick={onStopPulsing}
                        variant="outlined"
                        color="warning"
                        sx={{ mt: 1, ml: 0.5, whiteSpace: 'nowrap' }}
                    >
                        {t('bubbles.stopPulsing') || 'Stop pulsing'}
                    </Button>
                ) : null}
                {dueDate && (
                    <IconButton onClick={() => { setDueDate(null); setNotifications([]); }} sx={{ mt: 1 }}>
                        <Clear />
                    </IconButton>
                )}
            </Box>
            {dueDate && isOverdue(dueDate) && (
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1, marginTop: 1, padding: 1,
                    backgroundColor: 'rgba(244, 67, 54, 0.1)', borderRadius: 1,
                    border: '1px solid rgba(244, 67, 54, 0.3)'
                }}>
                    <Typography variant="caption" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                        {t('bubbles.overdue')}
                    </Typography>
                </Box>
            )}
            <Box>
                <AddNotification
                    open={notifDialogOpen}
                    onClose={() => setNotifDialogOpen(false)}
                    onSave={val => setNotifValue(val)}
                    initialValue={notifValue}
                    notifications={notifications}
                    onAdd={notifs => setNotifications(notifs)}
                    onDelete={handleDeleteNotification}
                    dueDate={dueDate}
                    themeMode={themeMode}
                />
            </Box>
            <RepeatSettings
                value={recurrence}
                onChange={setRecurrence}
                t={t}
                disabled={!dueDate}
                isMobile={isMobile}
            />
            <Box sx={{ marginTop: 2, marginBottom: 1, width: isMobile ? '95%' : '100%', marginX: isMobile ? 'auto' : 0 }}>
                <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 1 }}>
                    {t('bubbles.bubbleSizeLabel', { size: bubbleSize })}
                </Typography>
                <Slider
                    value={bubbleSize}
                    onChange={(event, newValue) => setBubbleSize(newValue)}
                    min={30}
                    max={80}
                    step={5}
                    marks={[{ value: 30, label: '30' }, { value: 45, label: '45' }, { value: 60, label: '60' }, { value: 80, label: '80' }]}
                    sx={{
                        '& .MuiSlider-thumb': { width: 20, height: 20 },
                        '& .MuiSlider-track': { height: 4 },
                        '& .MuiSlider-rail': { height: 4 }
                    }}
                />
            </Box>
            {isMobile && showStopPulsing ? (
                <Button
                    onClick={onStopPulsing}
                    variant="outlined"
                    color="warning"
                    fullWidth
                    size="small"
                    sx={{ borderRadius: 2, marginTop: 1 }}
                >
                    {t('bubbles.stopPulsing') || 'Stop pulsing'}
                </Button>
            ) : null}
        </>
    );
}
