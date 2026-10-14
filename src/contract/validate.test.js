import { describe, it, expect } from 'vitest';
import tasks from '../../contract/fixtures/tasks.json';
import categories from '../../contract/fixtures/categories.json';
import settings from '../../contract/fixtures/settings.json';
import { validateTask, validateCategory, validateSettings } from './validate';
import { createDefaultSettings } from './schema';

describe('validateTask (contract fixtures)', () => {
    it.each(tasks.valid)('accepts $name', ({ value }) => {
        expect(validateTask(value)).toEqual([]);
    });

    it.each(tasks.invalid)('rejects $name', ({ value }) => {
        expect(validateTask(value)).not.toEqual([]);
    });

    it('rejects non-objects', () => {
        expect(validateTask(null)).not.toEqual([]);
        expect(validateTask([])).not.toEqual([]);
    });
});

describe('validateCategory (contract fixtures)', () => {
    it.each(categories.valid)('accepts $name', ({ value }) => {
        expect(validateCategory(value)).toEqual([]);
    });

    it.each(categories.invalid)('rejects $name', ({ value }) => {
        expect(validateCategory(value)).not.toEqual([]);
    });
});

describe('validateSettings (contract fixtures)', () => {
    it.each(settings.valid)('accepts $name', ({ value }) => {
        expect(validateSettings(value)).toEqual([]);
    });

    it.each(settings.invalid)('rejects $name', ({ value }) => {
        expect(validateSettings(value)).not.toEqual([]);
    });

    it('accepts freshly created defaults', () => {
        expect(validateSettings(createDefaultSettings('uk-UA'))).toEqual([]);
        expect(createDefaultSettings('uk-UA').language).toBe('uk');
        expect(createDefaultSettings(undefined).language).toBe('en');
    });
});
