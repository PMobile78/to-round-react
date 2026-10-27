package com.pmobile78.todoround

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.data.Loaded
import com.pmobile78.todoround.ui.Session
import com.pmobile78.todoround.ui.TaskScreen
import com.pmobile78.todoround.ui.UserData
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant

/** The states of the screen of a task that the data of the emulators do not bring about. */
@RunWith(AndroidJUnit4::class)
class TaskScreenTest {
    @get:Rule
    val compose = createComposeRule()

    @Test
    fun aTaskTheCacheDoesNotHaveIsWaitedForUntilTheServerSaysItIsGone() {
        var fromCache by mutableStateOf(true)
        var gone = 0
        compose.setContent {
            val data = UserData(defaultSettings("en"), Loaded(emptyList(), 0, fromCache), Loaded(emptyList(), 0, fromCache))
            ToDoRoundTheme {
                TaskScreen(
                    "t1",
                    Session.SignedIn("olena@example.com", data),
                    onBack = {},
                    onAction = { _, _ -> },
                    onToggle = { _, _ -> },
                    onGone = { gone++ },
                )
            }
        }
        compose.onNodeWithTag("loading").assertExists()
        assertEquals(0, gone)

        fromCache = false
        compose.waitForIdle()
        assertEquals(1, gone)
    }

    @Test
    fun theQuestionOfDeleteForeverGoesWhenTheTaskIsRestoredElsewhere() {
        val deleted = Instant.parse("2026-10-24T09:00:00Z")
        val inTrash = Task(
            id = "t1", title = "Old note", description = "", categoryId = null, status = TaskStatus.DELETED,
            due = null, reminders = emptyList(), repeat = null, radius = 45, pulseMuted = false,
            createdAt = deleted, updatedAt = deleted, deletedAt = deleted,
        )
        var task by mutableStateOf(inTrash)
        var actions = 0
        compose.setContent {
            val data = UserData(defaultSettings("en"), Loaded(listOf(task), 0, false), Loaded(emptyList(), 0, false))
            ToDoRoundTheme {
                TaskScreen(
                    "t1",
                    Session.SignedIn("olena@example.com", data),
                    onBack = {},
                    onAction = { _, _ -> actions++ },
                    onToggle = { _, _ -> },
                    onGone = {},
                )
            }
        }
        compose.onNodeWithTag("action_delete_forever").performClick()
        compose.onNodeWithTag("delete_forever_confirm").assertExists()

        // Another device restores the task while the question is open: the question goes with the status,
        // and it does not come back when the task is deleted again.
        task = inTrash.copy(status = TaskStatus.ACTIVE, deletedAt = null)
        compose.onNodeWithTag("delete_forever_confirm").assertDoesNotExist()
        task = inTrash
        compose.onNodeWithTag("action_delete_forever").assertExists()
        compose.onNodeWithTag("delete_forever_confirm").assertDoesNotExist()
        assertEquals(0, actions)
    }
}
