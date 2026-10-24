import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Button,
    IconButton,
    Divider,
    Tooltip,
    Typography
} from '@mui/material';
import { CloseOutlined, DeleteOutlined, CheckCircle, DoneAll } from '@mui/icons-material';
import { LIMITS } from '../contract/schema';
import BubbleDialogForm from './BubbleDialogForm';

export default function BubbleDialog(props) {
    const {
        mode, // 'create' or 'edit'
        open,
        onClose,
        t,
        isSmallScreen,
        isMobile,
        getDialogPaperStyles,
        // Create mode props
        createDue,
        setCreateDue,
        createReminders,
        setCreateReminders,
        createRepeat,
        setCreateRepeat,
        bubbleSize,
        setBubbleSize,
        onCreate,
        // Edit mode props
        initialTitle,
        initialDescription,
        editDue,
        setEditDue,
        editReminders,
        setEditReminders,
        editBubbleSize,
        setEditBubbleSize,
        handleDeleteBubble,
        handleMarkAsDone,
        handleFinishSeries,
        showFinishSeries,
        handleSaveBubble,
        editRepeat,
        setEditRepeat,
        onStopPulsing,
        showStopPulsing,
        // Shared props
        tags,
        selectedTagId,
        setSelectedTagId
    } = props;

    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');

    React.useEffect(() => {
        if (open) {
            if (mode === 'create') {
                setTitle('');
                setDescription('');
            } else {
                setTitle(initialTitle || '');
                setDescription(initialDescription || '');
            }
        }
    }, [open, mode, initialTitle, initialDescription]);

    // Determine which form props to pass based on mode
    const formDue = mode === 'create' ? createDue : editDue;
    const setFormDue = mode === 'create' ? setCreateDue : setEditDue;
    const formReminders = mode === 'create' ? createReminders : editReminders;
    const setFormReminders = mode === 'create' ? setCreateReminders : setEditReminders;
    const formRepeat = mode === 'create' ? createRepeat : editRepeat;
    const setFormRepeat = mode === 'create' ? setCreateRepeat : setEditRepeat;
    const formBubbleSize = mode === 'create' ? bubbleSize : editBubbleSize;
    const setFormBubbleSize = mode === 'create' ? setBubbleSize : setEditBubbleSize;
    const titleKey = mode === 'create' ? 'bubbles.createNewBubble' : 'bubbles.editBubble';
    // Spec 3.1: a description holds at most 100 000 characters; a longer one is not saved.
    const descriptionTooLong = description.length > LIMITS.descriptionMaxLength;
    // While its sections spell a date that does not exist (02/31), the picker hands over an Invalid Date.
    const dueInvalid = Number.isNaN(formDue?.getTime());
    const cannotSave = !title.trim() || descriptionTooLong || dueInvalid;
    // "Finish series" is there for a repeating task, whose "Done" moves the due on (spec 4.1):
    // a line under the buttons tells the two apart, for phones have no hover
    const repeatActionsHint = mode === 'edit' && showFinishSeries;

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
                color: 'text.primary',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                {t(titleKey)}
                <IconButton onClick={onClose} sx={{ color: 'text.primary' }}>
                    <CloseOutlined />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{
                padding: isMobile ? 2 : 3,
                maxWidth: '100%',
                overflowY: 'auto',
                overflowX: 'hidden'
            }}>
                <BubbleDialogForm
                    t={t}
                    isSmallScreen={isSmallScreen}
                    isMobile={isMobile}
                    title={title}
                    setTitle={setTitle}
                    description={description}
                    setDescription={setDescription}
                    descriptionTooLong={descriptionTooLong}
                    due={formDue}
                    setDue={setFormDue}
                    reminders={formReminders}
                    setReminders={setFormReminders}
                    repeat={formRepeat}
                    setRepeat={setFormRepeat}
                    tags={tags}
                    selectedTagId={selectedTagId}
                    setSelectedTagId={setSelectedTagId}
                    bubbleSize={formBubbleSize}
                    setBubbleSize={setFormBubbleSize}
                    showStopPulsing={mode === 'edit' ? showStopPulsing : false}
                    onStopPulsing={mode === 'edit' ? onStopPulsing : () => {}}
                />
            </DialogContent>
            <Divider />
            <DialogActions sx={{
                padding: isMobile ? 2 : 3,
                ...(repeatActionsHint && { paddingBottom: 1 }),
                display: 'flex',
                justifyContent: 'space-between',
                flexDirection: isSmallScreen ? 'column' : 'row',
                // Buttons wider than the dialog (Ukrainian, a repeating task) go on to the next line, the dialog does not scroll sideways
                flexWrap: isSmallScreen ? 'nowrap' : 'wrap',
                rowGap: 1
            }}>
                {mode === 'create' ? (
                    <>
                        <Button onClick={onClose} color="inherit" fullWidth={isSmallScreen} sx={{ minHeight: isMobile ? 48 : 36 }}>
                            {t('bubbles.cancel')}
                        </Button>
                        <Button onClick={() => onCreate({ title, description })} variant="contained" fullWidth={isSmallScreen} sx={{ borderRadius: 2, minHeight: isMobile ? 48 : 36 }} disabled={cannotSave}>
                            {t('bubbles.create')}
                        </Button>
                    </>
                ) : (
                    <>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: isSmallScreen ? 0.75 : 1, flexDirection: isSmallScreen ? 'column' : 'row', order: isSmallScreen ? 3 : 1, width: isSmallScreen ? '100%' : 'auto' }}>
                            <Button
                                onClick={handleDeleteBubble}
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteOutlined />}
                                fullWidth={isSmallScreen}
                                size={isSmallScreen ? 'small' : 'medium'}
                                sx={{ borderRadius: 2, ...(!isSmallScreen && { minHeight: 36 }) }}
                            >
                                {t('bubbles.deleteBubble')}
                            </Button>
                            {/* The hints also open on a long press; above the button they stay clear of the finger */}
                            <Tooltip title={t(showFinishSeries ? 'bubbles.markAsDoneRepeatHint' : 'bubbles.markAsDoneHint')} describeChild placement="top">
                                <Button
                                    onClick={handleMarkAsDone}
                                    variant="outlined"
                                    color="success"
                                    startIcon={<CheckCircle />}
                                    fullWidth={isSmallScreen}
                                    size={isSmallScreen ? 'small' : 'medium'}
                                    sx={{ borderRadius: 2, ...(!isSmallScreen && { minHeight: 36 }) }}
                                >
                                    {t('bubbles.markAsDone')}
                                </Button>
                            </Tooltip>
                            {showFinishSeries && (
                                <Tooltip title={t('bubbles.finishSeriesHint')} describeChild placement="top">
                                    <Button
                                        onClick={handleFinishSeries}
                                        variant="outlined"
                                        color="success"
                                        startIcon={<DoneAll />}
                                        fullWidth={isSmallScreen}
                                        size={isSmallScreen ? 'small' : 'medium'}
                                        sx={{ borderRadius: 2, ...(!isSmallScreen && { minHeight: 36 }) }}
                                    >
                                        {t('bubbles.finishSeries')}
                                    </Button>
                                </Tooltip>
                            )}
                            {isMobile && showStopPulsing ? (
                                <Tooltip title={t('bubbles.stopPulsingHint')} describeChild placement="top">
                                    <Button
                                        onClick={onStopPulsing}
                                        variant="outlined"
                                        color="warning"
                                        fullWidth={isSmallScreen}
                                        size="small"
                                        sx={{
                                            borderRadius: 2,
                                            ...(!isSmallScreen ? { alignSelf: 'flex-start', whiteSpace: 'nowrap' } : {})
                                        }}
                                    >
                                        {t('bubbles.stopPulsing') || 'Stop pulsing'}
                                    </Button>
                                </Tooltip>
                            ) : null}
                        </Box>
                        {/* On a line of their own Cancel and Save stay on the right */}
                        <Box sx={{ display: 'flex', flexGrow: 1, justifyContent: 'flex-end', gap: isSmallScreen ? 0.75 : 1, flexDirection: isSmallScreen ? 'column' : 'row', width: isSmallScreen ? '100%' : 'auto', order: isSmallScreen ? 1 : 2 }}>
                            <Button onClick={onClose} color="inherit" fullWidth={isSmallScreen} size={isSmallScreen ? 'small' : 'medium'} sx={{ order: isSmallScreen ? 2 : 1, ...(!isSmallScreen && { minHeight: 36 }) }}>
                                {t('bubbles.cancel')}
                            </Button>
                            <Button onClick={() => handleSaveBubble({ title, description })} variant="contained" fullWidth={isSmallScreen} size={isSmallScreen ? 'small' : 'medium'} sx={{ borderRadius: 2, order: isSmallScreen ? 1 : 2, ...(!isSmallScreen && { minHeight: 36 }) }} disabled={cannotSave}>
                                {t('bubbles.save')}
                            </Button>
                        </Box>
                    </>
                )}
            </DialogActions>
            {repeatActionsHint && (
                <Typography variant="caption" color="text.secondary" component="p" sx={{ paddingX: isMobile ? 2 : 3, paddingBottom: isMobile ? 2 : 3 }}>
                    {t('bubbles.repeatActionsHint')}
                </Typography>
            )}
        </Dialog>
    );
}
