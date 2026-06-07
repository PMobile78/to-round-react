/* eslint-disable no-console */
// Local TZ verification: run with `TZ=UTC node test-tz.js` to emulate Cloud Functions runtime
const { _test } = require('./index.js');
const { parseLocalDateTime, formatLocalDateTime, computeNextFutureDueDate, isBubbleOverdue } = _test;

let failed = 0;
const check = (name, actual, expected) => {
    const ok = actual === expected;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${actual}${ok ? '' : ` (expected ${expected})`}`);
};

// 1. Naive string + user tz → correct instant (compare epoch ms; TZDate prints with offset)
check('parse Kyiv 13:00 → UTC instant',
    parseLocalDateTime('2026-06-07T13:00:00', 'Europe/Kyiv').getTime(),
    new Date('2026-06-07T10:00:00Z').getTime());

// 2. Round-trip: instant → user-local string
check('format 10:00Z in Kyiv',
    formatLocalDateTime(new Date('2026-06-07T10:00:00Z'), 'Europe/Kyiv'),
    '2026-06-07T13:00:00');

// 3. Legacy (no tz): interpreted in server TZ (UTC here)
check('legacy parse without tz (server TZ)',
    parseLocalDateTime('2026-06-07T13:00:00').toISOString(),
    '2026-06-07T13:00:00.000Z');

// 4. User scenario: due 06:00 Kyiv, repeat 1h, now 13:10 Kyiv (10:10Z) → next future = 14:00 Kyiv
const due = parseLocalDateTime('2026-06-07T06:00:00', 'Europe/Kyiv');
const now = new Date('2026-06-07T10:10:00Z');
const next = computeNextFutureDueDate(due, { every: 1, unit: 'hours' }, now);
check('catch-up: 06:00 Kyiv +1h steps → next future',
    formatLocalDateTime(next, 'Europe/Kyiv'),
    '2026-06-07T14:00:00');

// 5. isBubbleOverdue honours tz: build wall-clock strings around the real "now"
const kyivStr = (msFromNow) => formatLocalDateTime(new Date(Date.now() + msFromNow), 'Europe/Kyiv');
check('overdue: due 1 min ago (Kyiv wall time)',
    String(isBubbleOverdue({ dueDate: kyivStr(-60 * 1000), tz: 'Europe/Kyiv' })), 'true');
check('not overdue: due in 1 hour (Kyiv wall time)',
    String(isBubbleOverdue({ dueDate: kyivStr(60 * 60 * 1000), tz: 'Europe/Kyiv' })), 'false');

// 6. DST: +1 day across Kyiv summer→winter transition (2026-10-25) keeps local wall time
const beforeDst = parseLocalDateTime('2026-10-24T13:00:00', 'Europe/Kyiv');
const afterDst = computeNextFutureDueDate(beforeDst, { every: 1, unit: 'days' }, new Date('2026-10-24T11:00:00Z'));
check('DST: daily repeat keeps 13:00 local across transition',
    formatLocalDateTime(afterDst, 'Europe/Kyiv'),
    '2026-10-25T13:00:00');

process.exit(failed ? 1 : 0);
