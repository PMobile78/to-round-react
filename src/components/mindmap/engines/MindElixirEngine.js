import React, { useEffect, useRef } from 'react';
import MindElixir from 'mind-elixir';
import { en } from 'mind-elixir/i18n';
import 'mind-elixir/style.css';
import { Box } from '@mui/material';

// Wraps the mind-elixir built-in editor. Data is the library's native tree,
// stored as a JSON string in map.engineData.
const MindElixirEngine = ({ map, onChange }) => {
    const elRef = useRef(null);
    const meRef = useRef(null);
    const saveTimer = useRef(null);
    const onChangeRef = useRef(onChange);

    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    useEffect(() => {
        if (!elRef.current) return undefined;

        const me = new MindElixir({
            el: elRef.current,
            direction: MindElixir.RIGHT,
            contextMenu: { locale: en }
        });
        meRef.current = me;

        let data = null;
        try {
            const parsed = JSON.parse(map.engineData || '');
            if (parsed && parsed.nodeData) data = parsed;
        } catch {
            data = null;
        }
        me.init(data || MindElixir.new(map.title || 'Central idea'));

        const persist = () => {
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => {
                try {
                    onChangeRef.current(JSON.stringify(me.getData()));
                } catch {
                    /* ignore serialization errors */
                }
            }, 500);
        };
        me.bus.addListener('operation', persist);

        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current);
            meRef.current = null;
        };
    // Re-init only when the map identity changes (not on every data update).
    }, [map.id]);

    return <Box ref={elRef} sx={{ position: 'absolute', inset: 0, backgroundColor: '#fff' }} />;
};

export default MindElixirEngine;
