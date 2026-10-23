package com.pmobile78.todoround.ui

import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.data.Loaded
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class SessionTest {
    private val email = "olena@example.com"
    private val data = UserData(defaultSettings("en"), Loaded(emptyList(), 0, false), Loaded(emptyList(), 0, false))

    @Test
    fun `the data of the account come after a loading state`() = runBlocking {
        assertEquals(
            listOf(Session.SignedIn(email, null), Session.SignedIn(email, data)),
            signedInSession(email, flowOf(data)).toList(),
        )
    }

    @Test
    fun `a failed data flow ends in a failure on the screen, not in loading for ever`() = runBlocking {
        val refused = flow<UserData?> {
            emit(data)
            throw IllegalStateException("PERMISSION_DENIED")
        }
        assertEquals(
            listOf(Session.SignedIn(email, null), Session.SignedIn(email, data), Session.SignedIn(email, null, failed = true)),
            signedInSession(email, refused).toList(),
        )
    }
}
