import { describe, it, expect } from 'vitest';
import {
    EXPORT_VERSION,
    buildExportFilename,
    buildExportData,
    parseImportData
} from './bubbleJson';

describe('buildExportFilename', () => {
    it('builds a zero-padded timestamped filename', () => {
        // 2026-03-05 09:07 (month is 0-based, so 2 = March)
        const d = new Date(2026, 2, 5, 9, 7);
        expect(buildExportFilename(d)).toBe('todo-round-export-20260305-0907.json');
    });

    it('keeps already two-digit parts intact', () => {
        const d = new Date(2026, 11, 25, 14, 30); // December 25, 14:30
        expect(buildExportFilename(d)).toBe('todo-round-export-20261225-1430.json');
    });
});

describe('buildExportData', () => {
    const tags = [{ id: 't1', name: 'Work', color: '#ff0000' }];
    const bubbles = [{ id: 'b1', title: 'A', radius: 50, status: 'active' }];

    it('stamps version + exportedAt and sanitizes bubbles', () => {
        const date = new Date('2026-06-15T10:00:00.000Z');
        const data = buildExportData({ bubbles, tags }, date);
        expect(data.version).toBe(EXPORT_VERSION);
        expect(data.exportedAt).toBe('2026-06-15T10:00:00.000Z');
        expect(data.bubbles).toHaveLength(1);
        expect(data.bubbles[0].id).toBe('b1');
        expect(data.bubbles[0].title).toBe('A');
    });

    it('exports tags as-is (raw, not sanitized)', () => {
        const data = buildExportData({ bubbles, tags });
        expect(data.tags).toBe(tags);
    });
});

describe('parseImportData', () => {
    it('returns empty arrays when tags/bubbles are missing or not arrays', () => {
        expect(parseImportData(null)).toEqual({ importedTags: [], importedBubbles: [] });
        expect(parseImportData({})).toEqual({ importedTags: [], importedBubbles: [] });
        expect(parseImportData({ tags: 'x', bubbles: 5 })).toEqual({ importedTags: [], importedBubbles: [] });
    });

    it('sanitizes and drops invalid tags / bubbles (no id, null)', () => {
        const data = {
            tags: [{ id: 't1', name: 'Work', color: '#f00' }, { name: 'no id' }, null],
            bubbles: [{ id: 'b1', title: 'A' }, { title: 'no id' }, null]
        };
        const { importedTags, importedBubbles } = parseImportData(data);
        expect(importedTags.map((t) => t.id)).toEqual(['t1']);
        expect(importedBubbles.map((b) => b.id)).toEqual(['b1']);
    });
});

describe('export -> import round-trip', () => {
    it('preserves tags and a fully-specified bubble through a build/parse cycle', () => {
        const tags = [{ id: 't1', name: 'Work', color: '#ff0000' }];
        // A fixed point of sanitizeBubblesForExport -> sanitizeBubble: useRichText
        // defaults to false, which the export shape drops and the import shape
        // re-adds as false, so the round-trip is lossless here.
        const bubble = {
            id: 'b1',
            radius: 50,
            title: 'Task',
            description: 'Desc',
            fillStyle: '#ffffff',
            strokeStyle: '#000000',
            tagId: 't1',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
            deletedAt: null,
            dueDate: '2026-02-02T00:00:00.000Z',
            tz: 'UTC',
            notifications: [],
            recurrence: null,
            overdueSticky: false,
            overdueAt: null,
            overduePulseSuppressed: false,
            useRichText: false
        };

        const data = buildExportData({ bubbles: [bubble], tags }, new Date('2026-06-15T00:00:00.000Z'));
        const { importedTags, importedBubbles } = parseImportData(data);

        expect(importedTags).toEqual(tags);
        expect(importedBubbles).toEqual([bubble]);
    });
});
