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

export default function EditBubbleDialog(props) {
    const {
        open,
        onClose,
        t,
        isSmallScreen,
        isMobile,
        themeMode,
        getDialogPaperStyles,
        initialTitle,
        initialDescription,
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
        handleSaveBubble,
        editRecurrence,
        setEditRecurrence,
        onStopPulsing,
        showStopPulsing,
        useRichText,
        onToggleUseRichText
    } = props;

    const [title, setTitle] = React.useState(initialTitle || '');
    const [description, setDescription] = React.useState(initialDescription || '');

    React.useEffect(() => {
        if (open) {
            setTitle(initialTitle || '');
            setDescription(initialDescription || '');
        }
    }, [open, initialTitle, initialDescription]);

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
                {t('bubbles.editBubble')}
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
                    dueDate={editDueDate}
                    setDueDate={setEditDueDate}
                    isOverdue={isOverdue}
                    notifDialogOpen={notifDialogOpen}
                    setNotifDialogOpen={setNotifDialogOpen}
                    notifValue={notifValue}
                    setNotifValue={setNotifValue}
                    notifications={editNotifications}
                    setNotifications={setEditNotifications}
                    handleDeleteNotification={handleDeleteNotification}
                    recurrence={editRecurrence}
                    setRecurrence={setEditRecurrence}
                    tags={tags}
                    selectedTagId={selectedTagId}
                    setSelectedTagId={setSelectedTagId}
                    bubbleSize={editBubbleSize}
                    setBubbleSize={setEditBubbleSize}
                    showStopPulsing={showStopPulsing}
                    onStopPulsing={onStopPulsing}
                />
            </DialogContent>
            <Divider />
            <DialogActions sx={{
                padding: isSmallScreen ? 1.5 : 3,
                display: 'flex',
                justifyContent: 'space-between',
                flexDirection: isSmallScreen ? 'column' : 'row',
                gap: isSmallScreen ? 0.75 : 0
            }}>
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
            </DialogActions>
        </Dialog>
    );
}


