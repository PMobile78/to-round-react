import React from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, List, ListItem, Typography,
    useMediaQuery, useTheme,
} from '@mui/material';

const Section = ({ title, items }) => (items.length === 0 ? null : (
    <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2">{title}</Typography>
        <List dense disablePadding>
            {items.map((item) => <ListItem key={item.id} sx={{ py: 0 }}>{item.title ?? item.name}</ListItem>)}
        </List>
    </Box>
));

/**
 * The move from v1 (spec 9.1): the preview before anything is written, the progress, the errors.
 * state comes from useMigration; the dialog cannot be dismissed, only moved or postponed.
 */
const MigrationDialog = ({ state, onMove, onPostpone, onRetry, t }) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const paper = theme.custom?.dialogPaper || { backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary };
    const { step, preview } = state;
    return (
        <Dialog open fullScreen={fullScreen} maxWidth="sm" fullWidth PaperProps={{ sx: { ...paper } }}>
            <DialogTitle sx={{ color: 'text.primary' }}>{t('migration.title')}</DialogTitle>
            <DialogContent>
                {step === 'preview' && (
                    <>
                        <Typography gutterBottom>{t('migration.intro')}</Typography>
                        <Typography gutterBottom>{t('migration.counts', { tasks: preview.tasks, categories: preview.categories })}</Typography>
                        <Section title={t('migration.rounded')} items={preview.rounded} />
                        <Section title={t('migration.lostFormatting')} items={preview.lostFormatting} />
                        <Section title={t('migration.changed')} items={preview.changed} />
                        <Section title={t('migration.recolored')} items={preview.recolored} />
                        {(preview.skipped.tasks > 0 || preview.skipped.categories > 0) && (
                            <Typography sx={{ mt: 2 }}>{t('migration.skipped', preview.skipped)}</Typography>
                        )}
                        <Typography color="text.secondary" sx={{ mt: 2 }}>{t('migration.postponeHint')}</Typography>
                    </>
                )}
                {step === 'moving' && (
                    <>
                        <Typography gutterBottom>{t('migration.moving', { done: state.done, total: state.total })}</Typography>
                        <LinearProgress variant="determinate" value={state.total > 0 ? (state.done / state.total) * 100 : 0} />
                    </>
                )}
                {step === 'error' && <Typography color="error">{t(state.error)}</Typography>}
            </DialogContent>
            {step !== 'moving' && (
                <DialogActions sx={{ padding: 3, gap: 2 }}>
                    <Button onClick={onPostpone} color="inherit" variant="outlined" sx={{ borderRadius: 2 }}>{t('migration.postpone')}</Button>
                    {step === 'preview' && (
                        <Button onClick={onMove} color="primary" variant="contained" sx={{ borderRadius: 2 }}>{t('migration.move')}</Button>
                    )}
                    {step === 'error' && (
                        <Button onClick={onRetry} color="primary" variant="contained" sx={{ borderRadius: 2 }}>{t('migration.retry')}</Button>
                    )}
                </DialogActions>
            )}
        </Dialog>
    );
};

export default MigrationDialog;
