#!/usr/bin/env bash
# The device tests (app/src/androidTest) on the Android emulator against the local Firebase
# emulators. Run from the repository root by firebase emulators:exec (docs/android.md), with the
# APKs built before: Gradle does not run beside the Android emulator on this machine. The
# screenshots the tests take come back to android/app/build/device-screens.
set -euo pipefail

apks=android/app/build/outputs/apk
screens=/data/local/tmp/todoround-screens

# adb -e is "the only TCP/IP device", and a phone on Wi-Fi debugging is one too. The tests remove
# the app, so they run on the emulator only.
serial=$(adb -e get-serialno 2> /dev/null || true)
case $serial in
    emulator-*) ;;
    *)
        echo "device-tests.sh: adb -e finds '${serial:-no single device}', not the emulator: start it, or adb disconnect the phone" >&2
        exit 2
        ;;
esac

# Before the tests and after them, a failed run too: no app, no tests, no screenshots, no ports.
clean() {
    adb -e uninstall com.pmobile78.todoround.test > /dev/null 2>&1 || true
    adb -e uninstall com.pmobile78.todoround > /dev/null 2>&1 || true
    adb -e shell rm -rf "$screens" > /dev/null 2>&1 || true
    adb -e reverse --remove-all > /dev/null 2>&1 || true
}
clean
trap clean EXIT

adb -e install -t "$apks/debug/app-debug.apk" > /dev/null
adb -e install -t "$apks/androidTest/debug/app-debug-androidTest.apk" > /dev/null
# The app reaches the Firebase emulators of this computer at its own 127.0.0.1 (data/Backend.kt).
adb -e reverse tcp:9099 tcp:9099 > /dev/null
adb -e reverse tcp:8180 tcp:8180 > /dev/null
# A crash of the instrumentation itself still prints what it said and brings the screenshots back.
status=0
result=$(adb -e shell am instrument -w com.pmobile78.todoround.test/androidx.test.runner.AndroidJUnitRunner) || status=$?
rm -rf android/app/build/device-screens
adb -e pull "$screens" android/app/build/device-screens > /dev/null 2>&1 || true
printf '%s\n' "$result"
[ "$status" = 0 ] || exit "$status"
grep -q '^OK (' <<< "$result"
