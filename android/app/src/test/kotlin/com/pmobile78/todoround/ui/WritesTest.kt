package com.pmobile78.todoround.ui

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.withTimeoutOrNull
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class WritesTest {
    @Test
    fun `a write the server refuses comes out of the failures, a done write does not`() = runBlocking {
        val writes = Writes(this)
        var done = false
        writes.launch { done = true }
        writes.launch { throw IllegalStateException("PERMISSION_DENIED") }

        assertEquals(Unit, withTimeout(5_000) { writes.failures.first() })
        assertTrue(done)
        assertNull(withTimeoutOrNull(200) { writes.failures.first() })
    }

    @Test
    fun `a write cancelled with its screen is not a failure`() = runBlocking {
        // Unconfined: the write has started and waits when the scope is cancelled.
        val scope = CoroutineScope(Dispatchers.Unconfined + Job())
        val writes = Writes(scope)
        var started = false
        writes.launch {
            started = true
            awaitCancellation()
        }
        assertTrue(started)
        scope.cancel()

        assertNull(withTimeoutOrNull(200) { writes.failures.first() })
    }

    @Test
    fun `a write the core refused comes out of the failures, and several are one`() = runBlocking {
        val writes = Writes(this)
        writes.refuse()
        writes.refuse()

        assertEquals(Unit, withTimeout(5_000) { writes.failures.first() })
        assertNull(withTimeoutOrNull(200) { writes.failures.first() })
    }
}
