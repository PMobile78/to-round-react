const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const timeFixtures = require('../../../contract/fixtures/time.json');
const { isValidTimeZone, parseLocal, toInstant } = require('../../lib/time');

describe('toInstant (contract/fixtures/time.json)', () => {
    for (const { name, local, tz, instant } of timeFixtures.toInstant) {
        it(name, () => {
            assert.equal(toInstant(local, tz).toISOString(), instant);
        });
    }
});

describe('toInstant input checks', () => {
    it('throws on a malformed local time', () => {
        assert.throws(() => toInstant('2026-02-30T10:00', 'Europe/Kyiv'), /Invalid local date-time/);
        assert.throws(() => toInstant('2026-10-15 10:00', 'Europe/Kyiv'), /Invalid local date-time/);
    });

    it('parseLocal rejects impossible calendar values', () => {
        assert.equal(parseLocal('2026-13-01T10:00'), null);
        assert.equal(parseLocal('2026-10-15T24:00'), null);
        assert.deepEqual(parseLocal('2026-10-15T09:30'), { year: 2026, month: 10, day: 15, hour: 9, minute: 30 });
    });

    it('isValidTimeZone knows IANA zones and nothing else', () => {
        assert.equal(isValidTimeZone('Europe/Kyiv'), true);
        assert.equal(isValidTimeZone('America/New_York'), true);
        assert.equal(isValidTimeZone('Mars/Olympus'), false);
        assert.equal(isValidTimeZone(''), false);
        assert.equal(isValidTimeZone(null), false);
    });
});
