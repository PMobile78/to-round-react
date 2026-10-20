import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { APP_NAME } from './src/appName.js';

// The app name comes from src/appName.js: it fills the %APP_NAME% placeholders
// in index.html and names the generated site.webmanifest. The manifest link is
// injected here so that it carries the base path.
function appNamePlugin() {
    let base = '/';
    const manifest = JSON.stringify({
        name: APP_NAME,
        short_name: APP_NAME,
        icons: [
            { src: './web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: './web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
    }, null, 2);

    return {
        name: 'app-name',
        configResolved(config) {
            base = config.base;
        },
        transformIndexHtml(html) {
            return {
                html: html.replaceAll('%APP_NAME%', APP_NAME),
                tags: [{ tag: 'link', attrs: { rel: 'manifest', href: `${base}site.webmanifest` }, injectTo: 'head' }],
            };
        },
        // dev server: serve the manifest from memory
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url?.split('?')[0] !== `${base}site.webmanifest`) return next();
                res.setHeader('Content-Type', 'application/manifest+json');
                res.end(manifest);
            });
        },
        // build: write the manifest next to index.html
        generateBundle() {
            this.emitFile({ type: 'asset', fileName: 'site.webmanifest', source: manifest });
        },
    };
}

export default defineConfig({
    base: '/to-round-react/',
    plugins: [react(), appNamePlugin()],
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
