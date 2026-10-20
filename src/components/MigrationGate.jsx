import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useMigration } from '../hooks/useMigration';
import { logoutUser } from '../services/authService';
import MigrationDialog from './MigrationDialog';

/**
 * Holds the signed-in app back until the move from v1 is done, or shows it at once when there is
 * nothing to move (spec 9.1). "Postpone" signs out: the preview shows again at the next sign-in.
 */
const MigrationGate = ({ uid, settings, children }) => {
    const { t } = useTranslation();
    const { state, move, retry } = useMigration(uid, settings);
    if (state.step === 'ready') return children;
    if (state.step === 'checking') {
        return (
            <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: (theme) => theme.palette.background.bubbleView }}>
                <CircularProgress size={60} sx={{ color: 'white' }} />
            </Box>
        );
    }
    return <MigrationDialog state={state} onMove={move} onPostpone={() => logoutUser()} onRetry={retry} t={t} />;
};

export default MigrationGate;
