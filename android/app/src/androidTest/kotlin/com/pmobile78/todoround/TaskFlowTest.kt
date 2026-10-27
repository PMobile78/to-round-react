package com.pmobile78.todoround

import android.content.res.Configuration
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.ComposeTimeoutException
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.hasAnyAncestor
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performSemanticsAction
import androidx.core.os.LocaleListCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.Repeat
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.listDateTime
import com.pmobile78.todoround.core.model.nextFutureOccurrence
import com.pmobile78.todoround.data.SettingsRepository
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant
import java.time.ZoneId

/**
 * The screen of a task and the actions of the list on the emulators (stage 2 spec, sections 3 and
 * 7): the web's client writes the account and its tasks, the app shows them, and what the app writes
 * is what the web reads.
 */
@RunWith(AndroidJUnit4::class)
class TaskFlowTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private val backend = emulatorBackend()
    private val web = webBackend()
    private val here = ZoneId.systemDefault().id

    @Before
    fun startSignedOut() {
        backend.auth.signOut()
    }

    @After
    fun signOutAndForgetTheAppearance() {
        backend.auth.signOut()
        web.auth.signOut()
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.getEmptyLocaleList())
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
        }
    }

    /** A new account set up on the web's client, which stays signed in; the app signs in to it. Returns its uid. */
    private fun account(settings: Settings = defaultSettings("en").copy(listSort = ListSort(SortField.TITLE, SortOrder.ASC)), seed: suspend (String) -> Unit): String {
        val email = newEmail()
        val uid = runBlocking {
            val uid = web.signUp(email)
            SettingsRepository(web.db).createUserDoc(uid, settings)
            seed(uid)
            uid
        }
        runBlocking { backend.auth.signInWithEmailAndPassword(email, "secret-1").await() }
        return uid
    }

    // A task as the web writes it (src/services/data/convert.js), with a fixed time.
    private suspend fun task(
        uid: String,
        id: String,
        title: String,
        due: Due? = null,
        status: String = "active",
        description: String = "",
        categoryId: String? = null,
        reminders: List<Int> = emptyList(),
        repeat: Map<String, Any>? = null,
        pulseMuted: Boolean = false,
    ) {
        val time = Timestamp(Instant.parse("2026-10-01T08:00:00Z"))
        val data = mapOf(
            "schemaVersion" to 2,
            "title" to title,
            "description" to description,
            "categoryId" to categoryId,
            "status" to status,
            "due" to due?.let { mapOf("local" to it.local, "tz" to it.tz) },
            "reminders" to reminders,
            "repeat" to repeat,
            "radius" to 45,
            "pulseMuted" to pulseMuted,
            "overdueAt" to null,
            "createdAt" to time,
            "updatedAt" to time,
            "deletedAt" to if (status == "deleted") time else null,
        )
        web.db.document("users/$uid/tasks/$id").set(data).await()
    }

    private suspend fun category(uid: String, id: String, name: String) {
        val data = mapOf(
            "schemaVersion" to 2,
            "name" to name,
            "color" to "#46a549",
            "order" to 1,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp(),
        )
        web.db.document("users/$uid/categories/$id").set(data).await()
    }

    /** The task as the server has it, as the web reads it. */
    private fun stored(uid: String, id: String): DocumentSnapshot = runBlocking {
        withTimeout(30_000) { web.db.document("users/$uid/tasks/$id").fromServer() }
    }

    private fun waitFor(tag: String) {
        compose.waitUntil(60_000) { compose.onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty() }
    }

    private fun waitForText(text: String) {
        compose.waitUntil(60_000) { compose.onAllNodesWithText(text, substring = true).fetchSemanticsNodes().isNotEmpty() }
    }

    // The row of the task [title]; its buttons are nodes of their own inside it.
    private fun row(title: String) = hasTestTag("task") and hasText(title, substring = true)

    // A tap through the action of the node, which a keyboard or a moving list cannot make miss.
    private fun press(matcher: SemanticsMatcher) {
        compose.waitUntil(60_000) { compose.onAllNodes(matcher).fetchSemanticsNodes().isNotEmpty() }
        compose.onNode(matcher).performSemanticsAction(SemanticsActions.OnClick)
    }

    private fun open(title: String) {
        press(row(title))
        waitFor("task_screen")
    }

    private fun tab(name: String) {
        waitFor("tab_$name")
        compose.onNodeWithTag("tab_$name").performScrollTo().performSemanticsAction(SemanticsActions.OnClick)
    }

    private fun checkboxes(): List<ToggleableState> =
        compose.onAllNodesWithTag("checkbox").fetchSemanticsNodes().map { it.config[SemanticsProperties.ToggleableState] }

    private fun waitForCheckboxes(expected: List<ToggleableState>) {
        try {
            compose.waitUntil(60_000) { runCatching { checkboxes() == expected }.getOrDefault(false) }
        } catch (e: ComposeTimeoutException) {
            // The assertion below shows what the screen has instead.
        }
        assertEquals(expected, checkboxes())
    }

    private fun darkScreen(): Boolean = runCatching {
        (compose.activity.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    }.getOrDefault(false)

    @Test
    fun aTaskOpensFromItsRowWithAllItsFields() {
        account { uid ->
            category(uid, "home", "Home")
            task(
                uid, "t1", "Water the plants",
                due = Due("2099-12-31T08:00", here),
                categoryId = "home",
                reminders = listOf(60, 2880),
                repeat = mapOf("every" to 2, "unit" to "weeks", "weekdays" to listOf(1, 5)),
                description = "## Pots\n- [ ] the big one\n- [x] **the small one**\n\n> by the window\n\n[care](https://example.com)",
            )
        }
        open("Water the plants")

        compose.onNodeWithTag("status").assertTextEquals("Active")
        compose.onNodeWithTag("title").assertTextEquals("Water the plants")
        compose.onNodeWithText("Due date: 12/31/2099, 08:00").assertExists()
        compose.onNodeWithText("Home").assertExists()
        assertEquals(
            listOf("1 hour before", "2 days before"),
            compose.onAllNodesWithTag("reminder").fetchSemanticsNodes().map { it.config[SemanticsProperties.Text].joinToString() },
        )
        compose.onNodeWithTag("repeat").assertTextEquals("Every 2 weeks: MON, FRI")
        waitForCheckboxes(listOf(ToggleableState.Off, ToggleableState.On))
        compose.onNodeWithText("Pots").assertExists()
        compose.onNodeWithText("by the window").assertExists()
        compose.onNodeWithText("care").assertExists()
        compose.onNodeWithText("Created: ${listDateTime(Instant.parse("2026-10-01T08:00:00Z"), here, Language.EN)}").assertExists()
        compose.onNodeWithTag("action_done").assertTextEquals("Mark as Done")
        compose.onNodeWithTag("action_finish_series").assertTextEquals("Finish series")
        compose.onNodeWithTag("action_delete").assertTextEquals("Delete Task")
        compose.onNodeWithTag("repeat_hint").assertExists()
        screenshot("task-en-light")

        compose.onNodeWithTag("back").performSemanticsAction(SemanticsActions.OnClick)
        waitFor("home")
    }

    @Test
    fun theActionsOfTheRowsAndOfTheScreenAreWrittenAsTheWebReadsThem() {
        val uid = account { uid ->
            task(uid, "once", "Once")
            task(uid, "daily", "Daily", due = Due("2026-10-01T09:30", here), repeat = mapOf("every" to 1, "unit" to "days"), pulseMuted = true)
            task(uid, "trashed", "Trashed", status = "deleted")
        }
        // The row: "Done" of a one-off task, "Restore" among the done tasks, "Delete" from its menu.
        press(hasTestTag("row_action_done") and hasAnyAncestor(row("Once")))
        compose.waitUntil(60_000) { stored(uid, "once").getString("status") == "done" }
        tab("done")
        press(hasTestTag("row_action_restore") and hasAnyAncestor(row("Once")))
        compose.waitUntil(60_000) { stored(uid, "once").getString("status") == "active" }
        tab("active")
        press(hasTestTag("row_menu") and hasAnyAncestor(row("Once")))
        press(hasTestTag("menu_action_delete"))
        compose.waitUntil(60_000) { stored(uid, "once").let { it.getString("status") == "deleted" && it.getTimestamp("deletedAt") != null } }

        // The screen: out of the trash, back into it, and out of it for good after the question. Each
        // action closes the screen, and the list is back at the tab it was on.
        tab("deleted")
        open("Once")
        press(hasTestTag("action_restore"))
        waitFor("home")
        compose.onNodeWithTag("tab_deleted").assertIsSelected()
        compose.waitUntil(60_000) { stored(uid, "once").let { it.getString("status") == "active" && it.get("deletedAt") == null } }
        tab("active")
        open("Once")
        press(hasTestTag("action_delete"))
        waitFor("home")
        compose.waitUntil(60_000) { stored(uid, "once").getString("status") == "deleted" }
        tab("deleted")
        open("Once")
        press(hasTestTag("action_delete_forever"))
        press(hasText("Cancel"))
        assertTrue(stored(uid, "once").exists())
        press(hasTestTag("action_delete_forever"))
        press(hasTestTag("delete_forever_confirm"))
        waitFor("home")
        compose.waitUntil(60_000) { !stored(uid, "once").exists() }
        // The menu of a row asks too.
        press(hasTestTag("row_menu") and hasAnyAncestor(row("Trashed")))
        press(hasTestTag("menu_action_delete_forever"))
        press(hasTestTag("delete_forever_confirm"))
        compose.waitUntil(60_000) { !stored(uid, "trashed").exists() }

        // "Done" on the screen of a repeating task moves its due on and closes the screen.
        tab("active")
        open("Daily")
        val before = Instant.now()
        press(hasTestTag("action_done"))
        val after = Instant.now()
        waitFor("home")
        val expected = setOf(before, after).map { nextFutureOccurrence("2026-10-01T09:30", here, Repeat(1, RepeatUnit.DAYS), it) }
        compose.waitUntil(60_000) { (stored(uid, "daily").get("due") as Map<*, *>)["local"] != "2026-10-01T09:30" }
        val daily = stored(uid, "daily")
        assertTrue((daily.get("due") as Map<*, *>)["local"] in expected)
        assertEquals("active", daily.getString("status"))
        assertEquals(false, daily.getBoolean("pulseMuted"))
        // "Finish series" ends it.
        open("Daily")
        press(hasTestTag("action_finish_series"))
        waitFor("home")
        compose.waitUntil(60_000) { stored(uid, "daily").getString("status") == "done" }
    }

    @Test
    fun aTickedItemIsWrittenAndAChangeOfTheWebShowsLive() {
        val uid = account { uid -> task(uid, "t1", "Shopping", description = "Buy:\n- [ ] milk\n- [ ] bread") }
        open("Shopping")
        waitForCheckboxes(listOf(ToggleableState.Off, ToggleableState.Off))

        compose.onAllNodesWithTag("checkbox")[0].performSemanticsAction(SemanticsActions.OnClick)
        compose.waitUntil(60_000) { stored(uid, "t1").getString("description") == "Buy:\n- [x] milk\n- [ ] bread" }
        waitForCheckboxes(listOf(ToggleableState.On, ToggleableState.Off))

        // The web ticks the other one: the open screen follows.
        runBlocking { web.db.document("users/$uid/tasks/t1").update(mapOf("description" to "Buy:\n- [x] milk\n- [x] bread", "updatedAt" to FieldValue.serverTimestamp())).await() }
        waitForCheckboxes(listOf(ToggleableState.On, ToggleableState.On))
    }

    @Test
    fun aTaskDeletedForeverElsewhereClosesItsScreenWithAMessage() {
        val uid = account { uid -> task(uid, "t1", "Old note", status = "deleted") }
        tab("deleted")
        open("Old note")
        runBlocking { web.db.document("users/$uid/tasks/t1").delete().await() }
        waitFor("home")
        waitForText("The task is no longer here.")
    }

    @Test
    fun aChangeTheCoreRefusesIsNotSentAndTheListSaysSo() {
        // "Done" would move this daily task into the year 10000, which the contract has no room for.
        val uid = account { uid -> task(uid, "t1", "Last day", due = Due("9999-12-31T23:00", here), repeat = mapOf("every" to 1, "unit" to "days")) }
        open("Last day")
        press(hasTestTag("action_done"))
        waitFor("home")
        waitForText("The change could not be saved.")
        assertEquals("9999-12-31T23:00", (stored(uid, "t1").get("due") as Map<*, *>)["local"])
    }

    @Test
    fun theMenuOfARowStaysWithItsTaskWhenTheListMovesUnderIt() {
        val uid = account { uid ->
            task(uid, "b", "B task")
            task(uid, "c", "C task")
        }
        press(hasTestTag("row_menu") and hasAnyAncestor(row("C task")))
        waitFor("menu_action_delete")
        // Another device adds a task that comes first: the rows below move down one place.
        runBlocking { task(uid, "a", "A task") }
        compose.waitUntil(60_000) { compose.onAllNodes(row("A task")).fetchSemanticsNodes().isNotEmpty() }
        press(hasTestTag("menu_action_delete"))
        compose.waitUntil(60_000) { stored(uid, "c").getString("status") == "deleted" }
        assertEquals("active", stored(uid, "b").getString("status"))
        assertEquals("active", stored(uid, "a").getString("status"))

        // A menu whose task leaves the tab goes with it, and does not open again when the task comes back.
        press(hasTestTag("row_menu") and hasAnyAncestor(row("B task")))
        waitFor("menu_action_delete")
        val b = web.db.document("users/$uid/tasks/b")
        runBlocking { b.update(mapOf("status" to "done", "updatedAt" to FieldValue.serverTimestamp())).await() }
        compose.waitUntil(60_000) { compose.onAllNodes(row("B task")).fetchSemanticsNodes().isEmpty() }
        runBlocking { b.update(mapOf("status" to "active", "updatedAt" to FieldValue.serverTimestamp())).await() }
        compose.waitUntil(60_000) { compose.onAllNodes(row("B task")).fetchSemanticsNodes().isNotEmpty() }
        compose.onAllNodesWithTag("menu_action_delete").assertCountEquals(0)
    }

    @Test
    fun theTaskSpeaksTheLanguageOfTheAccountInItsTheme() {
        account(defaultSettings("uk").copy(themeMode = ThemeMode.DARK)) { uid ->
            task(
                uid, "t1", "Купити хліб",
                due = Due("2026-10-01T09:30", here),
                reminders = listOf(60, 10080),
                repeat = mapOf("every" to 3, "unit" to "days"),
                description = "- [x] житній\n- [ ] білий",
            )
        }
        compose.waitUntil(60_000) { darkScreen() }
        open("Купити хліб")
        compose.onNodeWithTag("status").assertTextEquals("Активне")
        compose.onNodeWithText("Прострочено").assertExists()
        assertEquals(
            listOf("За 1 годину", "За 1 тиждень"),
            compose.onAllNodesWithTag("reminder").fetchSemanticsNodes().map { it.config[SemanticsProperties.Text].joinToString() },
        )
        compose.onNodeWithTag("repeat").assertTextEquals("Кожні 3 дні")
        waitForCheckboxes(listOf(ToggleableState.On, ToggleableState.Off))
        compose.onNodeWithTag("action_done").assertTextEquals("Позначити як готове")
        screenshot("task-uk-dark")
    }
}
