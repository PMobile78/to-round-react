import { defineConfig } from 'vitest/config';

// Rehearsal of the move (docs/migration.md): runs against the emulators of
// `npm run start:emulator`, only through `npm run rehearsal:load` and `npm run rehearsal:check`.
export default defineConfig({
    test: {
        include: ['scripts/rehearsal/**/*.rehearsal.js'],
        environment: 'happy-dom',
        fileParallelism: false,
        testTimeout: 120000,
        hookTimeout: 60000,
    },
});
