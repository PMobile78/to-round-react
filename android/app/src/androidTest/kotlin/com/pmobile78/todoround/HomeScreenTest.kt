package com.pmobile78.todoround

import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.data.Loaded
import com.pmobile78.todoround.ui.HomeScreen
import com.pmobile78.todoround.ui.Session
import com.pmobile78.todoround.ui.UserData
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
import kotlinx.coroutines.flow.flowOf
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** The states of the screen that the data of the emulators do not bring about. */
@RunWith(AndroidJUnit4::class)
class HomeScreenTest {
    @get:Rule
    val compose = createComposeRule()

    private val data = UserData(defaultSettings("en"), Loaded(emptyList(), 0, false), Loaded(emptyList(), 0, false))

    @Test
    fun dataThatCouldNotBeReadAreSaid() {
        compose.setContent {
            ToDoRoundTheme {
                HomeScreen(Session.SignedIn("olena@example.com", data = null, failed = true), onSignOut = {})
            }
        }
        compose.onNodeWithTag("failed").assertTextEquals("The data could not be read. Sign out and sign in again.")
    }

    @Test
    fun aWriteTheServerRefusedIsSaid() {
        compose.setContent {
            ToDoRoundTheme {
                HomeScreen(Session.SignedIn("olena@example.com", data), onSignOut = {}, writeFailures = flowOf(Unit))
            }
        }
        compose.waitUntil(10_000) { compose.onAllNodesWithText("The change could not be saved.").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("The change could not be saved.").assertExists()
    }
}
