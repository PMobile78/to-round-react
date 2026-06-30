import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentUser } from './authService';
import { lsGet, lsSet } from '../utils/storage';
import logger from '../utils/logger';

const MINDMAPS_COLLECTION = 'user-mindmaps';
const MINDMAPS_SUBCOLLECTION = 'maps';

const getUserId = () => {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }
    return user.uid;
};

export const NODE_SHAPES = ['rounded', 'square', 'circle', 'ellipse', 'pill', 'cloud', 'none'];
export const LINE_STYLES = ['solid', 'dashed'];

// Default palette for top-level branches (cycled through)
export const BRANCH_COLORS = [
    '#E5484D', // red
    '#F76808', // orange
    '#FFB224', // amber
    '#46A758', // green
    '#12A594', // teal
    '#0091FF', // blue
    '#8E4EC6', // purple
    '#E93D82'  // pink
];

const sanitizeNode = (node) => ({
    id: String(node.id),
    parentId: node.parentId != null ? String(node.parentId) : null,
    text: typeof node.text === 'string' ? node.text : '',
    x: Number.isFinite(node.x) ? node.x : 0,
    y: Number.isFinite(node.y) ? node.y : 0,
    color: node.color || null,
    shape: NODE_SHAPES.includes(node.shape) ? node.shape : 'rounded',
    fontSize: Number.isFinite(node.fontSize) ? node.fontSize : 16,
    bold: !!node.bold,
    icon: node.icon || null,
    imageUrl: node.imageUrl || null,
    lineStyle: LINE_STYLES.includes(node.lineStyle) ? node.lineStyle : 'solid',
    lineWidth: Number.isFinite(node.lineWidth) ? node.lineWidth : 6,
    collapsed: !!node.collapsed
});

export const MINDMAP_ENGINES = ['custom', 'reactflow', 'mindelixir'];

const sanitizeMap = (map) => {
    const engine = MINDMAP_ENGINES.includes(map.engine) ? map.engine : 'custom';
    const base = {
        id: String(map.id),
        title: typeof map.title === 'string' ? map.title : '',
        engine,
        createdAt: map.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    if (engine === 'custom') {
        return {
            ...base,
            rootId: map.rootId != null ? String(map.rootId) : null,
            nodes: Array.isArray(map.nodes) ? map.nodes.map(sanitizeNode) : []
        };
    }
    // reactflow / mindelixir: opaque engine-native data stored as a JSON string.
    return {
        ...base,
        engineData: typeof map.engineData === 'string' ? map.engineData : ''
    };
};

const lsKey = (uid) => `mindmaps_${uid}`;

const loadFromLocal = (uid) => {
    try {
        const stored = lsGet(lsKey(uid));
        return stored || [];
    } catch (e) {
        logger.error('Failed to parse local mindmaps', e);
        return [];
    }
};

const saveToLocal = (uid, maps) => {
    try {
        lsSet(lsKey(uid), maps);
    } catch (e) {
        logger.error('Failed to save local mindmaps', e);
    }
};

export const loadMindmaps = async () => {
    let uid;
    try {
        uid = getUserId();
    } catch (e) {
        return [];
    }
    try {
        const mapsCol = collection(db, MINDMAPS_COLLECTION, uid, MINDMAPS_SUBCOLLECTION);
        const snapshot = await getDocs(mapsCol);
        const maps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        return maps;
    } catch (error) {
        logger.error('Error loading mindmaps from Firestore, using localStorage', error);
        return loadFromLocal(uid);
    }
};

export const saveMindmap = async (map) => {
    const clean = sanitizeMap(map);
    let uid;
    try {
        uid = getUserId();
    } catch (e) {
        return clean;
    }
    try {
        const ref = doc(db, MINDMAPS_COLLECTION, uid, MINDMAPS_SUBCOLLECTION, clean.id);
        await setDoc(ref, { ...clean, updatedAt: serverTimestamp() }, { merge: true });
    } catch (error) {
        logger.error('Error saving mindmap to Firestore, using localStorage', error);
        const maps = loadFromLocal(uid);
        const idx = maps.findIndex(m => m.id === clean.id);
        if (idx >= 0) maps[idx] = clean; else maps.push(clean);
        saveToLocal(uid, maps);
    }
    return clean;
};

export const deleteMindmap = async (mapId) => {
    let uid;
    try {
        uid = getUserId();
    } catch (e) {
        return;
    }
    try {
        const ref = doc(db, MINDMAPS_COLLECTION, uid, MINDMAPS_SUBCOLLECTION, String(mapId));
        await deleteDoc(ref);
    } catch (error) {
        logger.error('Error deleting mindmap from Firestore, using localStorage', error);
        const maps = loadFromLocal(uid).filter(m => m.id !== String(mapId));
        saveToLocal(uid, maps);
    }
};

export const getMindmap = async (mapId) => {
    let uid;
    try {
        uid = getUserId();
    } catch (e) {
        return null;
    }
    try {
        const ref = doc(db, MINDMAPS_COLLECTION, uid, MINDMAPS_SUBCOLLECTION, String(mapId));
        const snap = await getDoc(ref);
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (error) {
        logger.error('Error getting mindmap from Firestore, using localStorage', error);
        return loadFromLocal(uid).find(m => m.id === String(mapId)) || null;
    }
};

export const subscribeToMindmaps = (callback) => {
    let uid;
    try {
        uid = getUserId();
    } catch (e) {
        callback([]);
        return () => {};
    }
    try {
        const mapsCol = collection(db, MINDMAPS_COLLECTION, uid, MINDMAPS_SUBCOLLECTION);
        return onSnapshot(mapsCol, (querySnap) => {
            const list = [];
            querySnap.forEach(d => list.push({ id: d.id, ...d.data() }));
            callback(list);
        }, (err) => {
            logger.warn('Mindmaps onSnapshot error, falling back to localStorage', err);
            callback(loadFromLocal(uid));
        });
    } catch (error) {
        logger.error('Error setting up mindmaps listener', error);
        callback(loadFromLocal(uid));
        return () => {};
    }
};
