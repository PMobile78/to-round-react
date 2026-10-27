package com.pmobile78.todoround.ui

import android.util.Log
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch

/**
 * The writes of the screens (stage 2 spec, 2.2 №17). A write runs in [scope] and does not hold the
 * screen up: Firestore shows the change at once from its cache and sends it when it can. A write
 * the server refuses, or one the core refused before it went (2.2 №16), comes out of [failures],
 * which the screen shows as a short message; a failure waits there until the screen takes it, and
 * several at once are one message.
 */
class Writes(private val scope: CoroutineScope) {
    private val failed = Channel<Unit>(Channel.CONFLATED)

    val failures: Flow<Unit> = failed.receiveAsFlow()

    /** A write the core refused: it is not sent, and the screen says so as for a refusal of the server. */
    fun refuse() {
        failed.trySend(Unit)
    }

    fun launch(write: suspend () -> Unit) {
        scope.launch {
            try {
                write()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.w("Writes", "a write failed", e)
                failed.trySend(Unit)
            }
        }
    }
}
