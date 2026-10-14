// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AboutDialog from './AboutDialog';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('AboutDialog deploy time', () => {
    let container;
    let root;

    const renderAbout = () => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => {
            root.render(<AboutDialog open onClose={() => {}} />);
        });
    };

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.unstubAllEnvs();
    });

    it('shows the deploy moment set by CI in local time', () => {
        vi.stubEnv('REACT_APP_BUILD_TIME', new Date(2026, 9, 14, 22, 15).toISOString());
        renderAbout();
        expect(document.body.textContent).toContain('Deployed: 14.10.2026 22:15');
    });

    it('shows "-" in a build without a deploy time', () => {
        vi.stubEnv('REACT_APP_BUILD_TIME', '');
        renderAbout();
        expect(document.body.textContent).toContain('Deployed: -');
    });
});
