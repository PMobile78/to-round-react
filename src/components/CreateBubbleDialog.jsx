import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Divider
} from '@mui/material';
import { CloseOutlined } from '@mui/icons-material';
import BubbleDialogForm from './BubbleDialogForm';

export default function CreateBubbleDialog(props) {
    const {
        open,
        onClose,
        t,
        isSmallScreen,
        isMobile,
        themeMode,
        getDialogPaperStyles,
        dueDate,
        setDueDate,
        isOverdue,
        notifDialogOpen,
        setNotifDialogOpen,
        notifValue,
        setNotifValue,
        createNotifications,
        setCreateNotifications,
        handleDeleteCreateNotification,
        tags,
        selectedTagId,
        setSelectedTagId,
        bubbleSize,
        setBubbleSize,
        onCreate,
        useRichText,
        onToggleUseRichText,
        createRecurrence,
        setCreateRecurrence
    } = props;

    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');

    React.useEffect(() => {
        if (open) {
            setTitle('');
            setDescription('');
        }
    }, [open]);

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
                {t('bubbles.createNewBubble')}
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
                    dueDate={dueDate}
                    setDueDate={setDueDate}
                    isOverdue={isOverdue}
                    notifDialogOpen={notifDialogOpen}
                    setNotifDialogOpen={setNotifDialogOpen}
                    notifValue={notifValue}
                    setNotifValue={setNotifValue}
                    notifications={createNotifications}
                    setNotifications={setCreateNotifications}
                    handleDeleteNotification={handleDeleteCreateNotification}
                    recurrence={createRecurrence}
                    setRecurrence={setCreateRecurrence}
                    tags={tags}
                    selectedTagId={selectedTagId}
                    setSelectedTagId={setSelectedTagId}
                    bubbleSize={bubbleSize}
                    setBubbleSize={setBubbleSize}
                    showStopPulsing={false}
                    onStopPulsing={() => {}}
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
                <Button onClick={onClose} color="inherit" fullWidth={isSmallScreen} sx={{ minHeight: isMobile ? 48 : 36 }}>
                    {t('bubbles.cancel')}
                </Button>
                <Button onClick={() => onCreate({ title, description })} variant="contained" fullWidth={isSmallScreen} sx={{ borderRadius: 2, minHeight: isMobile ? 48 : 36 }} disabled={!title.trim()}>
                    {t('bubbles.create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}


