import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
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
import { CloseOutlined, DeleteOutlined, CheckCircle, Clear } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import ru from 'date-fns/locale/ru';
import AddNotification from './AddNotification';

export default function EditBubbleDialog(props) {
    const {
        open,
        onClose,
        t,
        isSmallScreen,
        isMobile,
        themeMode,
        getDialogPaperStyles,
        title,
        setTitle,
        description,
        setDescription,
        editDueDate,
        setEditDueDate,
        isOverdue,
        notifDialogOpen,
        setNotifDialogOpen,
        notifValue,
        setNotifValue,
        editNotifications,
        setEditNotifications,
        handleDeleteNotification,
        tags,
        selectedTagId,
        setSelectedTagId,
        editBubbleSize,
        setEditBubbleSize,
        handleDeleteBubble,
        handleMarkAsDone,
        handleSaveBubble
    } = props;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isSmallScreen}
            PaperProps={{
                sx: {
                    borderRadius: isSmallScreen ? 0 : 3,
                    ...getDialogPaperStyles(),
                    margin: isMobile ? 1 : 3
                }
            }}
        >
            <DialogTitle sx={{
                backgroundColor: 'primary.main',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                {t('bubbles.editBubble')}
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <CloseOutlined />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{
                padding: isMobile ? 2 : 3,
                maxWidth: '100%',
                overflowY: 'auto',
                overflowX: 'hidden'
            }}>
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
                <TextField
                    margin="dense"
                    label={t('bubbles.descriptionLabel')}
                    fullWidth
                    variant="outlined"
                    multiline
                    rows={isMobile ? 4 : 3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    sx={{
                        '& .MuiInputBase-input': {
                            fontSize: isMobile ? 16 : 14,
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-wrap'
                        },
                        '& .MuiInputBase-root': { wordBreak: 'break-word', overflowWrap: 'break-word' },
                        '& .MuiOutlinedInput-root': { wordBreak: 'break-word', overflowWrap: 'break-word' },
                        maxWidth: '100%',
                        marginTop: 2,
                        marginBottom: 2
                    }}
                />
                <Box sx={{ marginTop: 1, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
                            <DateTimePicker
                                label={t('bubbles.dueDateLabel')}
                                value={editDueDate}
                                onChange={setEditDueDate}
                                ampm={false}
                                views={["year", "month", "day", "hours", "minutes"]}
                                viewRenderers={{
                                    hours: renderTimeViewClock,
                                    minutes: renderTimeViewClock,
                                    seconds: renderTimeViewClock,
                                }}
                                inputFormat="dd.MM.yyyy HH:mm"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        margin="dense"
                                        sx={{
                                            marginTop: 2,
                                            marginBottom: 2,
                                            '& .MuiInputBase-root': {
                                                borderColor: isOverdue(editDueDate) ? '#f44336' : undefined,
                                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: isOverdue(editDueDate) ? '#f44336' : undefined,
                                                },
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: isOverdue(editDueDate) ? '#f44336' : undefined,
                                                }
                                            }
                                        }}
                                    />
                                )}
                            />
                        </LocalizationProvider>
                    </Box>
                    {editDueDate && (
                        <IconButton onClick={() => { setEditDueDate(null); setEditNotifications([]); }} sx={{ mt: 1 }}>
                            <Clear />
                        </IconButton>
                    )}
                </Box>
                {editDueDate && isOverdue(editDueDate) && (
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
                        notifications={editNotifications}
                        onAdd={notifs => setEditNotifications(notifs)}
                        onDelete={handleDeleteNotification}
                        dueDate={editDueDate}
                        themeMode={themeMode}
                    />
                </Box>
                <FormControl fullWidth margin="dense" variant="outlined">
                    <InputLabel>{t('bubbles.categoryLabel')}</InputLabel>
                    <Select
                        value={selectedTagId}
                        onChange={(e) => setSelectedTagId(e.target.value)}
                        label={t('bubbles.categoryLabel')}
                        sx={{ '& .MuiSelect-select': { fontSize: isMobile ? 16 : 14 } }}
                    >
                        <MenuItem value="">
                            <em>{t('bubbles.noCategory')}</em>
                        </MenuItem>
                        {tags.map(tag => (
                            <MenuItem key={tag.id} value={tag.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: tag.color, border: '1px solid #ccc' }} />
                                    {tag.name}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Box sx={{ marginTop: 2, marginBottom: 1, width: isMobile ? '95%' : '100%', marginX: isMobile ? 'auto' : 0 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 1 }}>
                        {t('bubbles.bubbleSizeLabel', { size: editBubbleSize })}
                    </Typography>
                    <Slider
                        value={editBubbleSize}
                        onChange={(event, newValue) => setEditBubbleSize(newValue)}
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
            </DialogContent>
            <DialogActions sx={{
                padding: isMobile ? 2 : 3,
                display: 'flex',
                justifyContent: 'space-between',
                flexDirection: isSmallScreen ? 'column' : 'row',
                gap: isSmallScreen ? 1 : 0
            }}>
                <Box sx={{ display: 'flex', gap: 1, flexDirection: isSmallScreen ? 'column' : 'row', order: isSmallScreen ? 3 : 1 }}>
                    <Button onClick={handleDeleteBubble} variant="outlined" color="error" startIcon={<DeleteOutlined />} fullWidth={isSmallScreen} sx={{ borderRadius: 2, minHeight: isMobile ? 48 : 36 }}>
                        {t('bubbles.deleteBubble')}
                    </Button>
                    <Button onClick={handleMarkAsDone} variant="outlined" color="success" startIcon={<CheckCircle />} fullWidth={isSmallScreen} sx={{ borderRadius: 2, minHeight: isMobile ? 48 : 36 }}>
                        {t('bubbles.markAsDone')}
                    </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexDirection: isSmallScreen ? 'column' : 'row', width: isSmallScreen ? '100%' : 'auto', order: isSmallScreen ? 1 : 2 }}>
                    <Button onClick={onClose} color="inherit" fullWidth={isSmallScreen} sx={{ minHeight: isMobile ? 48 : 36, order: isSmallScreen ? 2 : 1 }}>
                        {t('bubbles.cancel')}
                    </Button>
                    <Button onClick={handleSaveBubble} variant="contained" fullWidth={isSmallScreen} sx={{ borderRadius: 2, minHeight: isMobile ? 48 : 36, order: isSmallScreen ? 1 : 2 }} disabled={!title.trim()}>
                        {t('bubbles.save')}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}


