/* eslint-disable no-console */
// One-off backfill of nextNotifyAt for existing active bubbles. Run ONCE, then delete.
// Production:
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json TZ=UTC node functions/backfill-next-notify.js
// Emulator (for testing):
//   FIRESTORE_EMULATOR_HOST=localhost:8080 GOOGLE_CLOUD_PROJECT=demo TZ=UTC node functions/backfill-next-notify.js
const admin = require('firebase-admin');
// require('./index.js') initializes the Firebase admin app (it calls admin.initializeApp()).
// Reuse computeNextNotifyAt from its _test export so the calculation stays single-sourced.
const { _test } = require('./index.js');
const { computeNextNotifyAt } = _test;
const db = admin.firestore();

(async () => {
    const now = new Date();
    const snap = await db.collectionGroup('bubbles').where('status', '==', 'active').get();
    let updated = 0;
    for (const d of snap.docs) {
        const bubble = Object.assign({ id: d.id }, d.data() || {});
        const next = computeNextNotifyAt(bubble, now);
        await d.ref.set({
            nextNotifyAt: next
                ? admin.firestore.Timestamp.fromDate(next)
                : admin.firestore.FieldValue.delete()
        }, { merge: true });
        updated++;
    }
    console.log(`Backfilled ${updated} active bubbles`);
    process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
