package com.pmobile78.todoround.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.delay
import java.time.Clock
import java.time.Instant

/**
 * Now, as [clock] tells it, taken again at every full minute while the screen is shown and each
 * time it comes back (stage 2 spec, 2.2 №9): delay does not count the time the phone sleeps, and a
 * stopped screen does not tick. The tests give a clock of their own.
 */
@Composable
fun currentMinute(clock: Clock): Instant {
    var now by remember(clock) { mutableStateOf(clock.instant()) }
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(lifecycle, clock) {
        lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            while (true) {
                now = clock.instant()
                delay(MINUTE_MS - clock.millis() % MINUTE_MS)
            }
        }
    }
    return now
}

private const val MINUTE_MS = 60_000L
