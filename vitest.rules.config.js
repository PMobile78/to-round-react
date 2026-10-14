import { defineConfig } from 'vitest/config';

// Firestore security rules tests. They need the Firestore emulator, so they run only through
// `npm run test:rules` (firebase emulators:exec), never as part of plain `npm test`.
export default defineConfig({
    test: {
        include: ['firestore-tests/**/*.test.js'],
        environment: 'node',
        fileParallelism: false,
        testTimeout: 20000,
        hookTimeout: 30000,
    },
});
