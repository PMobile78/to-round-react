// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveJsonFile } from './saveJsonFile';

describe('saveJsonFile: the browser saves the data as a JSON file', () => {
    let clicks;

    beforeEach(() => {
        vi.useFakeTimers();
        clicks = [];
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
            clicks.push({ href: this.href, download: this.download, inPage: document.body.contains(this) });
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('offers the data under the file name and leaves no link in the page', async () => {
        saveJsonFile('to-round-backup.json', { tasks: [1] });
        expect(clicks).toEqual([{ href: 'blob:backup', download: 'to-round-backup.json', inPage: true }]);
        const file = URL.createObjectURL.mock.calls[0][0];
        expect(file.type).toBe('application/json');
        expect(await file.text()).toBe('{\n  "tasks": [\n    1\n  ]\n}');
        expect(document.querySelector('a')).toBeNull();
    });

    it('keeps the file for a minute: a browser may read it after the click (Safari asks first)', () => {
        saveJsonFile('to-round-backup.json', { tasks: [] });
        vi.advanceTimersByTime(59999);
        expect(URL.revokeObjectURL).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:backup');
    });
});
