import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
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
    test: {
        // Firestore rules tests need the emulator: they run only through `npm run test:rules`.
        // Agent worktrees under .claude/ hold copies of the repo tests: never collect them.
        // Cloud Functions tests run on node:test through `npm run test:functions`.
        exclude: [...configDefaults.exclude, 'firestore-tests/**', '.claude/**', 'functions/**'],
    },
});
