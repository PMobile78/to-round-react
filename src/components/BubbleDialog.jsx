import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Button,
    IconButton,
    Divider
} from '@mui/material';
import { CloseOutlined, DeleteOutlined, CheckCircle } from '@mui/icons-material';
import BubbleDialogForm from './BubbleDialogForm';

export default function BubbleDialog(props) {
    const {
        mode, // 'create' or 'edit'
        open,
        onClose,
        t,
        isSmallScreen,
        isMobile,
        themeMode,
        getDialogPaperStyles,
        // Create mode props
        dueDate,
        setDueDate,
        createNotifications,
        setCreateNotifications,
        handleDeleteCreateNotification,
        createRecurrence,
        setCreateRecurrence,
        bubbleSize,
        setBubbleSize,
        onCreate,
        useRichText,
        onToggleUseRichText,
        // Edit mode props
        initialTitle,
        initialDescription,
        editDueDate,
        setEditDueDate,
        editNotifications,
        setEditNotifications,
        handleDeleteNotification,
        editBubbleSize,
        setEditBubbleSize,
        handleDeleteBubble,
        handleMarkAsDone,
        handleSaveBubble,
        editRecurrence,
        setEditRecurrence,
        onStopPulsing,
        showStopPulsing,
        // Shared props
        isOverdue,
        notifDialogOpen,
        setNotifDialogOpen,
        notifValue,
        setNotifValue,
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
    const formDueDate = mode === 'create' ? dueDate : editDueDate;
    const setFormDueDate = mode === 'create' ? setDueDate : setEditDueDate;
    const formNotifications = mode === 'create' ? createNotifications : editNotifications;
    const setFormNotifications = mode === 'create' ? setCreateNotifications : setEditNotifications;
    const formHandleDeleteNotification = mode === 'create' ? handleDeleteCreateNotification : handleDeleteNotification;
    const formRecurrence = mode === 'create' ? createRecurrence : editRecurrence;
    const setFormRecurrence = mode === 'create' ? setCreateRecurrence : setEditRecurrence;
    const formBubbleSize = mode === 'create' ? bubbleSize : editBubbleSize;
    const setFormBubbleSize = mode === 'create' ? setBubbleSize : setEditBubbleSize;
    const titleKey = mode === 'create' ? 'bubbles.createNewBubble' : 'bubbles.editBubble';

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
                    themeMode={themeMode}
                    title={title}
                    setTitle={setTitle}
                    description={description}
                    setDescription={setDescription}
                    useRichText={useRichText}
                    onToggleUseRichText={onToggleUseRichText}
                    dueDate={formDueDate}
                    setDueDate={setFormDueDate}
                    isOverdue={isOverdue}
                    notifDialogOpen={notifDialogOpen}
                    setNotifDialogOpen={setNotifDialogOpen}
                    notifValue={notifValue}
                    setNotifValue={setNotifValue}
                    notifications={formNotifications}
                    setNotifications={setFormNotifications}
                    handleDeleteNotification={formHandleDeleteNotification}
                    recurrence={formRecurrence}
                    setRecurrence={setFormRecurrence}
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
                display: 'flex',
                justifyContent: 'space-between',
                flexDirection: isSmallScreen ? 'column' : 'row',
                gap: isSmallScreen ? 1 : 0
            }}>
                {mode === 'create' ? (
                    <>
                        <Button onClick={onClose} color="inherit" fullWidth={isSmallScreen} sx={{ minHeight: isMobile ? 48 : 36 }}>
                            {t('bubbles.cancel')}
                        </Button>
                        <Button onClick={() => onCreate({ title, description })} variant="contained" fullWidth={isSmallScreen} sx={{ borderRadius: 2, minHeight: isMobile ? 48 : 36 }} disabled={!title.trim()}>
                            {t('bubbles.create')}
                        </Button>
                    </>
                ) : (
                    <>
                        <Box sx={{ display: 'flex', gap: isSmallScreen ? 0.75 : 1, flexDirection: isSmallScreen ? 'column' : 'row', order: isSmallScreen ? 3 : 1, width: isSmallScreen ? '100%' : 'auto' }}>
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
                            {isMobile && showStopPulsing ? (
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
                            ) : null}
                        </Box>
                        <Box sx={{ display: 'flex', gap: isSmallScreen ? 0.75 : 1, flexDirection: isSmallScreen ? 'column' : 'row', width: isSmallScreen ? '100%' : 'auto', order: isSmallScreen ? 1 : 2 }}>
                            <Button onClick={onClose} color="inherit" fullWidth={isSmallScreen} size={isSmallScreen ? 'small' : 'medium'} sx={{ order: isSmallScreen ? 2 : 1, ...(!isSmallScreen && { minHeight: 36 }) }}>
                                {t('bubbles.cancel')}
                            </Button>
                            <Button onClick={() => handleSaveBubble({ title, description })} variant="contained" fullWidth={isSmallScreen} size={isSmallScreen ? 'small' : 'medium'} sx={{ borderRadius: 2, order: isSmallScreen ? 1 : 2, ...(!isSmallScreen && { minHeight: 36 }) }} disabled={!title.trim()}>
                                {t('bubbles.save')}
                            </Button>
                        </Box>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}
