import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box, Typography, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

const TagEditorDialog = ({
    open,
    onClose,
    isSmallScreen,
    isMobile,
    colorPalette,
    editingTag,
    tagName,
    setTagName,
    tagColor,
    setTagColor,
    isColorAvailable,
    canCreateMoreTags,
    onSave
}) => {
    const { t } = useTranslation();

    const isSaveDisabled = !tagName?.trim() ||
        (!editingTag && !isColorAvailable(tagColor)) ||
        (editingTag && editingTag.color !== tagColor && !isColorAvailable(tagColor));

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isSmallScreen}
        >
            <DialogTitle>
                {editingTag ? t('bubbles.editTag') : t('bubbles.createTag')}
            </DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label={t('bubbles.tagName')}
                    fullWidth
                    variant="outlined"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    sx={{
                        marginBottom: 2,
                        '& .MuiInputBase-input': { fontSize: isMobile ? 16 : 14 }
                    }}
                />
                <Box sx={{ marginBottom: 2 }}>
                    <Typography sx={{ marginBottom: 2 }}>{t('bubbles.selectColor')}:</Typography>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: 1.5,
                        maxWidth: 300,
                        margin: '0 auto'
                    }}>
                        {colorPalette.map((color, index) => {
                            const isUsed = editingTag
                                ? (!isColorAvailable(color) && color !== editingTag.color)
                                : (!isColorAvailable(color) && color !== tagColor);
                            const isSelected = tagColor === color;

                            return (
                                <Box
                                    key={index}
                                    onClick={() => { if (!isUsed) setTagColor(color); }}
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        backgroundColor: isUsed ? `${color}50` : color,
                                        border: isSelected
                                            ? '3px solid #1976d2'
                                            : isUsed
                                                ? `3px solid ${color}`
                                                : 'none',
                                        cursor: isUsed ? 'not-allowed' : 'pointer',
                                        position: 'relative',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        '&:hover': {
                                            transform: !isUsed ? 'scale(1.1)' : 'none',
                                            boxShadow: !isUsed ? '0 4px 8px rgba(0,0,0,0.2)' : 'none'
                                        }
                                    }}
                                >
                                    {isSelected && (
                                        <Box sx={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            color: 'white',
                                            fontSize: '16px',
                                            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                                        }}>
                                            ✓
                                        </Box>
                                    )}
                                </Box>
                            );
                        })}
                    </Box>
                    {!canCreateMoreTags() && !editingTag && (
                        <Typography variant="body2" color="error" sx={{ textAlign: 'center', marginTop: 2 }}>
                            {t('bubbles.noMoreColors')}
                        </Typography>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('bubbles.cancel')}</Button>
                <Button onClick={onSave} variant="contained" disabled={isSaveDisabled}>
                    {editingTag ? t('bubbles.save') : t('bubbles.create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TagEditorDialog;


