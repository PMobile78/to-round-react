package com.pmobile78.todoround

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
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
}
