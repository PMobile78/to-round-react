#!/usr/bin/env bash
# The device tests (app/src/androidTest) on the Android emulator against the local Firebase
# emulators. Run from the repository root by firebase emulators:exec (docs/android.md), with the
# APKs built before: Gradle does not run beside the Android emulator on this machine.
set -euo pipefail

apks=android/app/build/outputs/apk
adb -e uninstall com.pmobile78.todoround.test > /dev/null 2>&1 || true
adb -e uninstall com.pmobile78.todoround > /dev/null 2>&1 || true
adb -e install -t "$apks/debug/app-debug.apk" > /dev/null
adb -e install -t "$apks/androidTest/debug/app-debug-androidTest.apk" > /dev/null
# The app reaches the Firebase emulators of this computer at its own 127.0.0.1 (data/Backend.kt).
adb -e reverse tcp:9099 tcp:9099 > /dev/null
adb -e reverse tcp:8180 tcp:8180 > /dev/null
result=$(adb -e shell am instrument -w com.pmobile78.todoround.test/androidx.test.runner.AndroidJUnitRunner)
adb -e uninstall com.pmobile78.todoround.test > /dev/null
adb -e uninstall com.pmobile78.todoround > /dev/null
adb -e reverse --remove-all
printf '%s\n' "$result"
grep -q '^OK (' <<< "$result"
