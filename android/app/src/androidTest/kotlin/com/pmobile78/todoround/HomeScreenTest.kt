package com.pmobile78.todoround

import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.contract.deviceTimeZone
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.data.Loaded
import com.pmobile78.todoround.ui.HomeScreen
import com.pmobile78.todoround.ui.RemindersWindow
import com.pmobile78.todoround.ui.Session
import com.pmobile78.todoround.ui.UserData
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
import kotlinx.coroutines.flow.flowOf
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Clock
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZoneOffset

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

    @Test
    fun theMenuOpensTheRemindersOfThisPhone() {
        compose.setContent {
            ToDoRoundTheme {
                HomeScreen(Session.SignedIn("olena@example.com", data), onSignOut = {})
            }
        }
        compose.onNodeWithTag("menu").performClick()
        compose.onNodeWithTag("reminders").performClick()
        // android/device-tests.sh grants the permission to notify, and the emulator is no phone of Xiaomi.
        compose.onNodeWithTag("reminders_on").assertTextEquals("Notifications are on: reminders and overdue tasks come to this phone.")
        compose.onNodeWithTag("reminders_battery").assertExists()
        screenshot("reminders-en")
        compose.onNodeWithTag("reminders_close").performClick()
        compose.onNodeWithTag("reminders_on").assertDoesNotExist()
    }

    @Test
    fun theWindowSaysWhatMiuiNeedsAndThatNotificationsAreOff() {
        compose.setContent {
            ToDoRoundTheme {
                RemindersWindow(onClose = {}, xiaomi = true, allowed = { false })
            }
        }
        compose.onNodeWithTag("reminders_off")
            .assertTextEquals("Notifications are not allowed for this app, so reminders cannot reach this phone.")
        compose.onNodeWithTag("notification_settings").assertExists()
        compose.onNodeWithTag("reminders_xiaomi").assertTextContains("1. Autostart: on.", substring = true)
        compose.onNodeWithTag("reminders_battery").assertDoesNotExist()
        screenshot("reminders-xiaomi-off-en")
    }

    @Test
    fun aDueThatPassesWhileTheListIsShownIsOverdueAtTheNextMinute() {
        val due = Due("2026-10-24T12:01", deviceTimeZone())
        val dueMoment = LocalDateTime.parse(due.local).atZone(ZoneId.of(due.tz)).toInstant()
        val clock = TestClock(dueMoment.minusSeconds(30))
        val created = Instant.parse("2026-10-24T09:00:00Z")
        val task = Task(
            id = "t1", title = "Call the bank", description = "", categoryId = null, status = TaskStatus.ACTIVE,
            due = due, reminders = emptyList(), repeat = null, radius = 30, pulseMuted = false,
            createdAt = created, updatedAt = created, deletedAt = null,
        )
        compose.setContent {
            ToDoRoundTheme {
                HomeScreen(
                    Session.SignedIn("olena@example.com", data.copy(tasks = Loaded(listOf(task), 0, false))),
                    onSignOut = {},
                    clock = clock,
                )
            }
        }
        compose.onNodeWithTag("tab_planned").assertTextEquals("Planned Tasks (1)")
        compose.onNodeWithText("Overdue").assertDoesNotExist()

        clock.now = dueMoment.plusSeconds(1)
        compose.mainClock.advanceTimeBy(31_000)
        compose.onNodeWithTag("tab_planned").assertTextEquals("Planned Tasks (0)")
        compose.onNodeWithText("Overdue").assertExists()
    }

    // The time the screen reads; the test moves it.
    private class TestClock(var now: Instant) : Clock() {
        override fun instant(): Instant = now

        override fun getZone(): ZoneId = ZoneOffset.UTC

        override fun withZone(zone: ZoneId): Clock = this
    }
}
