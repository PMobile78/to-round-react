package com.pmobile78.todoround.ui

import kotlinx.coroutines.CoroutineScope
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
        val scope = CoroutineScope(Job())
        val writes = Writes(scope)
        writes.launch { awaitCancellation() }
        scope.cancel()

        assertNull(withTimeoutOrNull(200) { writes.failures.first() })
    }
}
