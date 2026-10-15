// Blocks `firebase deploy` from branch stage-0-data-contract-v2 until the data move (sub-plan 0.7):
// the v2 rules and functions would break the live v1 web app. Sub-plan 0.7 deletes this guard.
if (process.env.STAGE0_ALLOW_DEPLOY !== '1') {
    console.error('stage-0: firebase deploy is blocked until sub-plan 0.7 (see docs/firebase.md).');
    process.exit(1);
}
