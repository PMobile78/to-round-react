import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Typography } from '@mui/material';

/**
 * The steps of a backup import and the backup's errors (spec 10). state comes from useBackup:
 * null (closed), confirm (the numbers before anything is written), writing (no way out until the
 * batches are done), done or error.
 */
const BackupDialog = ({ state, onConfirm, onClose, isMobile, getDialogPaperStyles, t }) => {
    if (!state) return null;
    const { step, counts } = state;
    const writing = step === 'writing';
    return (
        <Dialog
            open
            onClose={writing ? undefined : onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, ...getDialogPaperStyles(), margin: isMobile ? 1 : 3 } }}
        >
            <DialogTitle sx={{ color: 'text.primary' }}>{t('backup.title')}</DialogTitle>
            <DialogContent>
                {step === 'confirm' && (
                    <>
                        <Typography gutterBottom>{t('backup.replace')}</Typography>
                        <Typography gutterBottom>{t('backup.inBackup', { tasks: counts.tasks, categories: counts.categories })}</Typography>
                        {(counts.deletedTasks > 0 || counts.deletedCategories > 0) && (
                            <Typography gutterBottom>
                                {t('backup.toDelete', { tasks: counts.deletedTasks, categories: counts.deletedCategories })}
                            </Typography>
                        )}
                        {counts.settings && <Typography gutterBottom>{t('backup.settings')}</Typography>}
                        {state.version === 1 && <Typography color="text.secondary">{t('backup.oldFormat')}</Typography>}
                    </>
                )}
                {writing && (
                    <>
                        <Typography gutterBottom>{t('backup.writing', { done: state.done, total: state.total })}</Typography>
                        <LinearProgress variant="determinate" value={state.total > 0 ? (state.done / state.total) * 100 : 0} />
                    </>
                )}
                {step === 'done' && <Typography>{t('backup.done')}</Typography>}
                {step === 'error' && <Typography color="error">{t(state.error.key, state.error.values)}</Typography>}
            </DialogContent>
            {!writing && (
                <DialogActions sx={{ padding: isMobile ? 2 : 3, gap: 2 }}>
                    {step === 'confirm' ? (
                        <>
                            <Button onClick={onClose} color="inherit" variant="outlined" sx={{ borderRadius: 2 }}>{t('bubbles.cancel')}</Button>
                            <Button onClick={onConfirm} color="primary" variant="contained" sx={{ borderRadius: 2 }}>{t('backup.confirm')}</Button>
                        </>
                    ) : (
                        <Button onClick={onClose} color="primary" variant="contained" sx={{ borderRadius: 2 }}>{t('bubbles.close')}</Button>
                    )}
                </DialogActions>
            )}
        </Dialog>
    );
};

export default BackupDialog;
