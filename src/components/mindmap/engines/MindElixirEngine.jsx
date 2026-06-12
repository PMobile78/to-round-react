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

        // mind-elixir centers the map using container.offsetHeight at init time.
        // When mounted inside an absolutely-positioned flex layout the final size
        // settles a frame later, so re-center once layout is stable and on resize,
        // otherwise the map stays parked in the top portion of the canvas.
        const recenter = () => meRef.current && meRef.current.toCenter();
        const raf = requestAnimationFrame(recenter);

        let ro = null;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(recenter);
            ro.observe(elRef.current);
        }

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
            cancelAnimationFrame(raf);
            if (ro) ro.disconnect();
            if (saveTimer.current) clearTimeout(saveTimer.current);
            meRef.current = null;
        };
    // Re-init only when the map identity changes (not on every data update).
    }, [map.id]);

    // mind-elixir forces `el.style.position = 'relative'` on init, which would
    // break an `inset: 0` absolute layout (height collapses to content). Fill the
    // parent with width/height instead so it stays full-height as a relative box.
    return <Box ref={elRef} sx={{ width: '100%', height: '100%', backgroundColor: '#fff' }} />;
};

export default MindElixirEngine;
