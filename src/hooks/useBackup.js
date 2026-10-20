import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { db } from '../firebase';
import { BackupError, readBackup } from '../contract/backup';
import { deviceTimeZone } from '../contract/time';
import { commitInBatches, exportBackup as readExport, planImport } from '../services/data/backup';
import { saveJsonFile } from '../utils/saveJsonFile';
import logger from '../utils/logger';

const REFUSALS = {
    'not-a-backup': 'backup.notBackup',
    'unsupported-version': 'backup.unsupported',
    'invalid-records': 'backup.invalid',
};

const refusalOf = (e) => {
    if (!(e instanceof BackupError)) {
        logger.error('Backup file could not be read:', e);
        return { key: 'backup.notBackup' };
    }
    return e.code === 'invalid-records' ? { key: REFUSALS[e.code], values: { n: e.count } } : { key: REFUSALS[e.code] };
};

/**
 * Backup export and import of the main menu (spec 10). state drives BackupDialog: null, or
 * { step: 'confirm', version, counts } | { step: 'writing', done, total } | { step: 'done' } |
 * { step: 'error', error: { key, values? } }. The file is checked whole before anything is read
 * or written; the writes follow the confirmation, and nothing reloads the page (#101).
 */
export function useBackup(uid) {
    const { i18n } = useTranslation();
    const [state, setState] = useState(null);
    const plan = useRef(null);

    const exportBackup = useCallback(async () => {
        try {
            const file = await readExport(db, uid);
            saveJsonFile(`to-round-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`, file);
        } catch (e) {
            logger.error('Backup export failed:', e);
            setState({ step: 'error', error: { key: 'backup.exportFailed' } });
        }
    }, [uid]);

    const importFile = useCallback(async (file) => {
        let data;
        try {
            data = JSON.parse(await file.text());
        } catch {
            setState({ step: 'error', error: { key: 'backup.notJson' } });
            return;
        }
        let backup;
        try {
            backup = readBackup(data, { now: new Date(), timeZone: deviceTimeZone(), language: i18n.language });
        } catch (e) {
            setState({ step: 'error', error: refusalOf(e) });
            return;
        }
        try {
            plan.current = await planImport(db, uid, backup);
        } catch (e) {
            logger.error('Backup import could not read the current data:', e);
            setState({ step: 'error', error: { key: 'backup.readFailed' } });
            return;
        }
        setState({ step: 'confirm', version: backup.version, counts: plan.current.counts });
    }, [uid, i18n.language]);

    const confirmImport = useCallback(async () => {
        const { writes } = plan.current;
        plan.current = null;
        setState({ step: 'writing', done: 0, total: writes.length });
        try {
            await commitInBatches(db, uid, writes, (done, total) => setState({ step: 'writing', done, total }));
            setState({ step: 'done' });
        } catch (e) {
            logger.error('Backup import failed:', e);
            setState({ step: 'error', error: { key: 'backup.writeFailed', values: { done: e.committed ?? 0, total: writes.length } } });
        }
    }, [uid]);

    const close = useCallback(() => {
        plan.current = null;
        setState(null);
    }, []);

    return { state, exportBackup, importFile, confirmImport, close };
}
