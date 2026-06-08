/* eslint-disable no-console */
// Run: TZ=UTC node functions/test-next-notify.js
const { _test } = require('./index.js');
const { computeNextNotifyAt } = _test;

let failed = 0;
const check = (name, actual, expected) => {
    const ok = actual === expected;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${actual}${ok ? '' : ` (expected ${expected})`}`);
};
const iso = (d) => (d ? d.toISOString() : 'null');

// due Kyiv 15:00 == 12:00Z (summer +3); reminders 11:00Z (за 60), 11:50Z (за 10); overdue 12:00Z
const mk = (over) => Object.assign({
    status: 'active',
    dueDate: '2026-06-07T15:00:00',
    tz: 'Europe/Kyiv',
    notifications: [{ minutesBefore: 60 }, { minutesBefore: 10 }]
}, over);

check('next = ближайший будущий reminder',
    iso(computeNextNotifyAt(mk(), new Date('2026-06-07T10:00:00Z'))), '2026-06-07T11:00:00.000Z');
check('next = второй reminder',
    iso(computeNextNotifyAt(mk(), new Date('2026-06-07T11:30:00Z'))), '2026-06-07T11:50:00.000Z');
check('next = overdue moment',
    iso(computeNextNotifyAt(mk(), new Date('2026-06-07T11:55:00Z'))), '2026-06-07T12:00:00.000Z');
check('просрочено, overdue не отправлен → fromTime',
    iso(computeNextNotifyAt(mk(), new Date('2026-06-07T12:30:00Z'))), '2026-06-07T12:30:00.000Z');
check('просрочено, overdueSticky → null',
    computeNextNotifyAt(mk({ overdueSticky: true }), new Date('2026-06-07T12:30:00Z')), null);
check('просрочено, suppressed → null',
    computeNextNotifyAt(mk({ overduePulseSuppressed: true }), new Date('2026-06-07T12:30:00Z')), null);
check('recurrence, просрочено → fromTime',
    iso(computeNextNotifyAt(mk({ recurrence: { every: 1, unit: 'days' } }), new Date('2026-06-07T12:30:00Z'))), '2026-06-07T12:30:00.000Z');
check('status != active → null',
    computeNextNotifyAt(mk({ status: 'done' }), new Date('2026-06-07T10:00:00Z')), null);
check('нет dueDate → null',
    computeNextNotifyAt(mk({ dueDate: null }), new Date('2026-06-07T10:00:00Z')), null);
check('нет notifications → overdue moment (due)',
    iso(computeNextNotifyAt(mk({ notifications: [] }), new Date('2026-06-07T10:00:00Z'))), '2026-06-07T12:00:00.000Z');

const { pickReminderToSend } = _test;
const pick = (b, now) => pickReminderToSend(b, now);

check('reminder: оба прошли → самый свежий (за 10)',
    pick(mk(), new Date('2026-06-07T11:50:30Z')).minutesBefore, 10);
check('reminder: прошёл только первый (за 60)',
    pick(mk(), new Date('2026-06-07T11:00:30Z')).minutesBefore, 60);
check('reminder: ни один не наступил → null',
    pick(mk(), new Date('2026-06-07T10:00:00Z')), null);

process.exit(failed ? 1 : 0);
