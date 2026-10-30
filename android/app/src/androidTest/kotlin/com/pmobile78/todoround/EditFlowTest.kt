package com.pmobile78.todoround

import android.content.res.Configuration
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.hasAnyAncestor
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTextReplacement
import androidx.core.os.LocaleListCompat
import androidx.lifecycle.ViewModelProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.data.SettingsRepository
import com.pmobile78.todoround.ui.AppViewModel
import com.pmobile78.todoround.ui.Session
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant
import java.time.ZoneId

/**
 * The form of a task in the app on the emulators (stage 2 spec, sections 3 and 7): "+" and "Edit"
 * write a task as the web reads it, a change of the web while the form is open stays, and the form
 * keeps its state and asks before its changes are lost.
 */
@RunWith(AndroidJUnit4::class)
class EditFlowTest {
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
            "status" to "active",
            "due" to due?.let { mapOf("local" to it.local, "tz" to it.tz) },
            "reminders" to reminders,
            "repeat" to repeat,
            "radius" to 45,
            "pulseMuted" to pulseMuted,
            "overdueAt" to null,
            "createdAt" to time,
            "updatedAt" to time,
            "deletedAt" to null,
        )
        web.db.document("users/$uid/tasks/$id").set(data).await()
    }

    private suspend fun category(uid: String, id: String, name: String, order: Int) {
        val data = mapOf(
            "schemaVersion" to 2,
            "name" to name,
            "color" to "#46a549",
            "order" to order,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp(),
        )
        web.db.document("users/$uid/categories/$id").set(data).await()
    }

    /** The task as the server has it, as the web reads it. */
    private fun stored(uid: String, id: String): DocumentSnapshot = runBlocking {
        withTimeout(30_000) { web.db.document("users/$uid/tasks/$id").fromServer() }
    }

    /** The only task of [uid] on the server, once there is one. */
    private fun onlyTask(uid: String): DocumentSnapshot = runBlocking {
        withTimeout(30_000) {
            var tasks = web.db.collection("users/$uid/tasks").get().await().documents
            while (tasks.isEmpty()) {
                delay(500)
                tasks = web.db.collection("users/$uid/tasks").get().await().documents
            }
            tasks.single()
        }
    }

    private fun waitFor(tag: String) {
        compose.waitUntil(60_000) { compose.onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty() }
    }

    private fun waitForText(text: String) {
        compose.waitUntil(60_000) { compose.onAllNodesWithText(text, substring = true).fetchSemanticsNodes().isNotEmpty() }
    }

    // A tap through the action of the node, which a keyboard or a moving list cannot make miss.
    private fun press(matcher: SemanticsMatcher) {
        compose.waitUntil(60_000) { compose.onAllNodes(matcher).fetchSemanticsNodes().isNotEmpty() }
        compose.onNode(matcher).performSemanticsAction(SemanticsActions.OnClick)
    }

    private fun press(tag: String) = press(hasTestTag(tag))

    // A node of the form, which may be below the fold.
    private fun field(tag: String) = compose.onNodeWithTag(tag).performScrollTo()

    private fun text(tag: String): String = compose.onNodeWithTag(tag).fetchSemanticsNode().config[SemanticsProperties.EditableText].text

    private fun open(title: String) {
        press(hasTestTag("task") and hasText(title, substring = true))
        waitFor("task_screen")
    }

    // The pickers in their keyboard modes: the date as typed in English ("MMDDYYYY"), then the hour and the minute.
    private fun pickDue(date: String, hour: String, minute: String) {
        press("edit_due")
        press(hasContentDescription("Switch to text input mode"))
        compose.onNode(hasSetTextAction() and hasAnyAncestor(isDialog())).performTextReplacement(date)
        press("date_ok")
        // Material 3 1.4 names this button after one mode or the other: "… for the time input".
        press(hasContentDescription("for the time input", substring = true))
        val time = compose.onAllNodes(hasSetTextAction() and hasAnyAncestor(isDialog()))
        time[0].performTextReplacement(hour)
        time[1].performTextReplacement(minute)
        press("time_ok")
    }

    private fun darkScreen(): Boolean = runCatching {
        (compose.activity.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    }.getOrDefault(false)

    @Test
    fun aNewTaskFromThePlusIsWrittenAsTheWebReadsIt() {
        val uid = account { uid -> category(uid, "home", "Home", 1) }
        press("new_task")
        waitFor("edit_screen")
        field("edit_title").performTextReplacement("Water the plants")
        field("edit_description").performTextReplacement("the big pot")
        press("md_tasks")
        press("edit_category")
        press("category_home")
        pickDue("11022026", "09", "30")
        press("remind_me")
        press("preset_60")
        press("reminder_save")
        press("repeat_switch")
        field("repeat_every").performTextReplacement("2")
        press("repeat_unit")
        press("repeat_unit_weeks")
        press("weekday_1")
        press("weekday_5")
        field("edit_size").performSemanticsAction(SemanticsActions.SetProgress) { it(60f) }
        press("edit_save")

        waitFor("home")
        waitForText("Water the plants")
        val doc = onlyTask(uid)
        assertEquals("Water the plants", doc.getString("title"))
        assertEquals("- [ ] the big pot", doc.getString("description"))
        assertEquals("home", doc.getString("categoryId"))
        assertEquals(mapOf("local" to "2026-11-02T09:30", "tz" to here), doc.get("due"))
        assertEquals(listOf(60L), doc.get("reminders"))
        assertEquals(mapOf("every" to 2L, "unit" to "weeks", "weekdays" to listOf(1L, 5L)), doc.get("repeat"))
        assertEquals(60L, doc.getLong("radius"))
        assertEquals("active", doc.getString("status"))
        assertEquals(false, doc.getBoolean("pulseMuted"))
        assertEquals(2L, doc.getLong("schemaVersion"))
        assertTrue(doc.contains("overdueAt") && doc.get("overdueAt") == null && doc.contains("deletedAt") && doc.get("deletedAt") == null)
        assertFalse(doc.contains("nextNotifyAt"))
        assertEquals(doc.getTimestamp("createdAt"), doc.getTimestamp("updatedAt"))
    }

    @Test
    fun everyFieldOfATaskIsChangedFromItsScreenAsTheWebReadsIt() {
        val uid = account { uid ->
            category(uid, "home", "Home", 1)
            task(
                uid, "t1", "Rent",
                due = Due("2026-11-30T09:00", here),
                description = "pay",
                categoryId = "home",
                reminders = listOf(60, 1440),
                repeat = mapOf("every" to 1, "unit" to "weeks", "weekdays" to listOf(1)),
                pulseMuted = true,
            )
        }
        open("Rent")
        press("edit")
        waitFor("edit_screen")
        field("edit_title").performTextReplacement("Pay rent")
        field("edit_description").performTextReplacement("pay **soon**")
        press("edit_category")
        press("category_none")
        pickDue("12152026", "10", "00")
        press("reminder_delete_1440")
        press("repeat_unit")
        press("repeat_unit_months")
        field("edit_size").performSemanticsAction(SemanticsActions.SetProgress) { it(70f) }
        press("edit_save")

        // The screen of the task is back and shows the new values.
        waitFor("task_screen")
        waitForText("Pay rent")
        compose.waitUntil(60_000) { stored(uid, "t1").getString("title") == "Pay rent" }
        val doc = stored(uid, "t1")
        assertEquals("pay **soon**", doc.getString("description"))
        assertEquals(null, doc.getString("categoryId"))
        assertEquals(mapOf("local" to "2026-12-15T10:00", "tz" to here), doc.get("due"))
        assertEquals(listOf(60L), doc.get("reminders"))
        // A monthly repeat takes the day of the new due; the weekdays stay with weeks.
        assertEquals(mapOf("every" to 1L, "unit" to "months", "monthDay" to 15L), doc.get("repeat"))
        assertEquals(70L, doc.getLong("radius"))
        // A new due lets the task pulse again.
        assertEquals(false, doc.getBoolean("pulseMuted"))
    }

    @Test
    fun whatTheWebChangesWhileTheFormIsOpenStays() {
        val uid = account { uid ->
            category(uid, "home", "Home", 1)
            task(uid, "t1", "Rent", description = "pay", categoryId = "home")
        }
        open("Rent")
        press("edit")
        waitFor("edit_screen")
        field("edit_description").performTextReplacement("pay today")
        // Meanwhile the web renames the task and deletes its category.
        runBlocking {
            web.db.document("users/$uid/tasks/t1").update(mapOf("title" to "Rent of November", "updatedAt" to FieldValue.serverTimestamp())).await()
            web.db.document("users/$uid/categories/home").delete().await()
        }
        // The form keeps what the user typed and shows the category as gone.
        waitForText("No Tag")
        assertEquals("Rent", text("edit_title"))
        press("edit_save")
        compose.waitUntil(60_000) { stored(uid, "t1").getString("description") == "pay today" }
        val doc = stored(uid, "t1")
        assertEquals("Rent of November", doc.getString("title"))
        // Without Cloud Functions on the emulators the id of the deleted category stays, as the form left it.
        assertEquals("home", doc.getString("categoryId"))
    }

    @Test
    fun aSaveTheCoreRefusesIsNotSentAndTheFormKeepsWhatTheUserChanged() {
        val uid = account { uid -> task(uid, "t1", "Gym", due = Due("2099-12-31T18:00", here), reminders = listOf(60)) }
        open("Gym")
        press("edit")
        waitFor("edit_screen")
        press("remind_me")
        press("preset_1440")
        press("reminder_save")
        // Meanwhile the web takes the due away, and the reminders with it.
        runBlocking {
            web.db.document("users/$uid/tasks/t1")
                .update(mapOf("due" to null, "reminders" to emptyList<Int>(), "updatedAt" to FieldValue.serverTimestamp())).await()
        }
        // The app has the change too: the task its core checks has no due.
        val app = compose.runOnUiThread { ViewModelProvider(compose.activity)[AppViewModel::class.java] }
        compose.waitUntil(60_000) {
            val signedIn = app.session.value as? Session.SignedIn
            signedIn?.data?.tasks?.items?.firstOrNull { it.id == "t1" }?.due == null
        }
        // Reminders without a due: the core does not send them, and the form stays with them and says so.
        press("edit_save")
        waitForText("The change could not be saved.")
        compose.onNodeWithTag("edit_screen").assertExists()
        compose.onNodeWithTag("reminder_delete_1440").assertExists()
        assertEquals(emptyList<Long>(), stored(uid, "t1").get("reminders"))
    }

    @Test
    fun theFormSurvivesATurnOfThePhoneAndAsksBeforeItsChangesAreLost() {
        account { }
        press("new_task")
        waitFor("edit_screen")
        field("edit_title").performTextReplacement("Call mum")
        compose.activityRule.scenario.recreate()
        waitFor("edit_screen")
        assertEquals("Call mum", text("edit_title"))
        // Back as the system sends it, through the dispatcher of the activity: a window of the system over the
        // app ("System UI isn't responding" on a loaded emulator) would keep Espresso waiting for the focus.
        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        press("discard_confirm")
        waitFor("home")
        waitForText("No active tasks")
    }

    @Test
    fun aTaskDeletedForeverWhileItsFormIsOpenClosesItWithAMessage() {
        val uid = account { uid -> task(uid, "t1", "Old note") }
        open("Old note")
        press("edit")
        waitFor("edit_screen")
        runBlocking { web.db.document("users/$uid/tasks/t1").delete().await() }
        waitFor("home")
        waitForText("The task is no longer here.")
    }

    @Test
    fun theFormSpeaksTheLanguageOfTheAccountInItsTheme() {
        account(defaultSettings("uk").copy(themeMode = ThemeMode.DARK)) { uid ->
            task(
                uid, "t1", "Купити хліб",
                due = Due("2026-10-01T09:30", here),
                description = "- [ ] житній",
                reminders = listOf(60),
                repeat = mapOf("every" to 3, "unit" to "days"),
            )
        }
        compose.waitUntil(60_000) { darkScreen() }
        open("Купити хліб")
        press("edit")
        waitFor("edit_screen")
        compose.onNodeWithText("Редагувати завдання").assertExists()
        compose.onNodeWithText("Заголовок").assertExists()
        compose.onNodeWithText("Прострочено").assertExists()
        compose.onNodeWithText("За 1 годину").assertExists()
        compose.onNodeWithText("Розмір бульбашки: 45px").assertExists()
        compose.onNodeWithTag("edit_save").assertExists()
        screenshot("edit-uk-dark")
    }
}
