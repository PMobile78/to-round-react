import fs from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { APP_NAME } from './appName';
import viteConfig from '../vite.config.js';

const ROOT = new URL('../', import.meta.url);
const read = (relPath) => fs.readFileSync(new URL(relPath, ROOT), 'utf8');

// Прежние варианты имени — не должны вернуться в код.
const OLD_NAMES = ['To-Round', 'Interactive Bubbles', 'Інтерактивні Бульбашки'];

const setupPlugin = () => {
    const plugin = viteConfig.plugins.flat().find((p) => p.name === 'app-name');
    plugin.configResolved({ base: '/to-round-react/' });
    return plugin;
};

describe('appNamePlugin', () => {
    it('подставляет APP_NAME в index.html и добавляет ссылку на манифест с base', () => {
        const result = setupPlugin().transformIndexHtml('<title>%APP_NAME%</title><meta content="%APP_NAME%">');
        expect(result.html).toBe(`<title>${APP_NAME}</title><meta content="${APP_NAME}">`);
        expect(result.tags).toEqual([
            { tag: 'link', attrs: { rel: 'manifest', href: '/to-round-react/site.webmanifest' }, injectTo: 'head' },
        ]);
    });

    it('генерирует site.webmanifest с именем APP_NAME и относительными путями иконок', () => {
        const emitFile = vi.fn();
        setupPlugin().generateBundle.call({ emitFile });
        expect(emitFile).toHaveBeenCalledTimes(1);
        const { type, fileName, source } = emitFile.mock.calls[0][0];
        expect(type).toBe('asset');
        expect(fileName).toBe('site.webmanifest');
        const manifest = JSON.parse(source);
        expect(manifest.name).toBe(APP_NAME);
        expect(manifest.short_name).toBe(APP_NAME);
        expect(manifest.icons.map((icon) => icon.src)).toEqual([
            './web-app-manifest-192x192.png',
            './web-app-manifest-512x512.png',
        ]);
    });
});

describe('единый источник имени приложения', () => {
    it('index.html берёт имя из плейсхолдера %APP_NAME%', () => {
        expect(read('index.html')).toContain('<title>%APP_NAME%</title>');
    });

    it('в index.html и src/ нет имени приложения литералом (кроме src/appName.js)', () => {
        const srcFiles = fs.readdirSync(new URL('src/', ROOT), { recursive: true })
            .filter((file) => /\.(js|jsx|json)$/.test(file))
            .filter((file) => !/\.test\.(js|jsx)$/.test(file) && file !== 'appName.js')
            .map((file) => `src/${file}`);
        const offenders = ['index.html', ...srcFiles].flatMap((relPath) => {
            const text = read(relPath);
            return [APP_NAME, ...OLD_NAMES]
                .filter((name) => text.includes(name))
                .map((name) => `${relPath}: ${name}`);
        });
        expect(offenders).toEqual([]);
    });

    it('статического public/site.webmanifest нет — манифест генерирует vite.config.js', () => {
        expect(fs.existsSync(new URL('public/site.webmanifest', ROOT))).toBe(false);
    });
});
