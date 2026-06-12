import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: '/to-round-react/',
    plugins: [react()],
    // CRA semantics preserved: same output dir, same dev port, same env var prefix
    envPrefix: 'REACT_APP_',
    build: {
        outDir: 'build',
    },
    server: {
        port: 3000,
    },
});
