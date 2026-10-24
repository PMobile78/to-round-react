package com.pmobile78.todoround

import android.content.res.Configuration
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ComposeTimeoutException
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performImeAction
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.core.os.LocaleListCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.ListFilter
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.listDateTime
import com.pmobile78.todoround.data.Backend
import com.pmobile78.todoround.data.SettingsRepository
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant
import java.time.ZoneId

/**
 * The task list on the emulators: the web's client writes an account, its categories and tasks,
 * and the app, signed in as the same user, shows them as the web's list with its tabs, search,
 * sort and filter (stage 2 spec, section 6); the sort and the filter the app writes are the ones
 * the web reads.
 */
@RunWith(AndroidJUnit4::class)
class ListFlowTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private val backend = emulatorBackend()
    private val web = webBackend()

    // A due in the zone of this device shows as written; the times of a record show in it too.
    private val here = ZoneId.systemDefault().id

    private fun created(at: String = "2026-10-01T08:00:00Z", language: Language = Language.EN): String {
        val label = if (language == Language.EN) "Created" else "Створено"
        return "$label: ${listDateTime(Instant.parse(at), here, language)}"
    }

    /**
     * Each row of the list as its texts, joined by "|". LazyColumn composes only the rows on the
     * screen: the rows a test checks must fit it.
     */
    private fun rows(): List<String> =
        compose.onAllNodesWithTag("task").fetchSemanticsNodes().map { it.config[SemanticsProperties.Text].joinToString("|") }

    // A look at the rows can meet the moment AppCompat recreates the screen, when there is no
    // Compose root at all: that look only means "not yet".
    private fun waitForRows(expected: List<String>) {
        try {
            compose.waitUntil(60_000) { runCatching { rows() == expected }.getOrDefault(false) }
        } catch (e: ComposeTimeoutException) {
            // The assertion below shows what the list has instead.
        }
        assertEquals(expected, rows())
    }

    /** The text of the node [tag], or null while there is none (the screen being recreated, say). */
    private fun label(tag: String): String? =
        runCatching { compose.onNodeWithTag(tag).fetchSemanticsNode().config[SemanticsProperties.Text].joinToString() }.getOrNull()

    // The row of tabs scrolls: a tab off the screen is brought onto it before the tap.
    private fun tab(name: String) {
        compose.onNodeWithTag("tab_$name").performScrollTo().performClick()
    }

    /** The screen itself is dark: the setting of AppCompat changes first, the screen is recreated after it. */
    private fun darkScreen(): Boolean = runCatching {
        (compose.activity.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    }.getOrDefault(false)

    /** A new account set up on the web's client, which stays signed in; returns its uid. */
    private suspend fun webAccount(email: String, settings: Settings): String {
        val uid = web.signUp(email)
        SettingsRepository(web.db).createUserDoc(uid, settings)
        return uid
    }

    // A category and a task as the web writes them (src/services/data/convert.js), the task with a fixed time.
    private suspend fun Backend.category(uid: String, id: String, name: String, color: String, order: Int = 1) {
        val data = mapOf(
            "schemaVersion" to 2,
            "name" to name,
            "color" to color,
            "order" to order,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp(),
        )
        db.document("users/$uid/categories/$id").set(data).await()
    }

    private suspend fun Backend.task(
        uid: String,
        id: String,
        title: String,
        categoryId: String?,
        due: Due? = null,
        status: String = "active",
        updatedAt: String = "2026-10-01T08:00:00Z",
        reminders: List<Int> = emptyList(),
        description: String = "",
    ) {
        val time = Timestamp(Instant.parse(updatedAt))
        val data = mapOf(
            "schemaVersion" to 2,
            "title" to title,
            "description" to description,
            "categoryId" to categoryId,
            "status" to status,
            "due" to due?.let { mapOf("local" to it.local, "tz" to it.tz) },
            "reminders" to reminders,
            "repeat" to null,
            "radius" to 45,
            "pulseMuted" to false,
            "overdueAt" to null,
            "createdAt" to time,
            "updatedAt" to time,
            "deletedAt" to if (status == "deleted") time else null,
        )
        db.document("users/$uid/tasks/$id").set(data).await()
    }

    /** The settings as the server has them, as the web reads them. */
    private fun storedSettings(uid: String): Map<*, *> = runBlocking {
        withTimeout(30_000) { web.db.document("users/$uid").fromServer().get("settings") as Map<*, *> }
    }

    @Before
    fun startSignedOut() {
        backend.auth.signOut()
    }

    // Signed out here, the next test does not start in this account's language and theme.
    @After
    fun signOutAndForgetTheAppearance() {
        backend.auth.signOut()
        web.auth.signOut()
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.getEmptyLocaleList())
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
        }
    }

    @Test
    fun theTabsAreTheTabsOfTheWebAndChangeLive() {
        val email = newEmail()
        val uid = runBlocking {
            // The web shows this account the category Home and the tasks without one, sorted by title.
            val settings = defaultSettings("en").copy(
                listFilter = ListFilter(categoryIds = listOf("home"), showUncategorized = true),
                listSort = ListSort(SortField.TITLE, SortOrder.ASC),
            )
            webAccount(email, settings).also { uid ->
                web.category(uid, "home", "Home", "#46a549")
                web.category(uid, "work", "Work", "#da3833", order = 2)
                web.task(uid, "t1", "buy milk", "home", Due("2026-10-01T09:30", here))
                web.task(uid, "t2", "Call the bank", "home", Due("2099-12-31T08:00", here))
                web.task(uid, "t3", "Apples", null)
                // A zone this phone does not know: the due is read in the zone of the phone, as the web reads it.
                web.task(uid, "t4", "Mars trip", "gone", Due("2026-10-01T09:30", "Mars/Olympus_Mons"))
                web.task(uid, "t5", "Report", "work")
                web.task(uid, "t6", "Done before", "home", status = "done")
                web.task(uid, "t7", "Old note", null, status = "deleted", updatedAt = "2026-10-02T08:00:00Z")
                // The rules leave the elements of reminders to the clients; the core wants whole hours.
                // The web shows such a task, the app only counts it (spec 6).
                web.task(uid, "t8", "Odd", null, Due("2026-10-01T09:30", "UTC"), reminders = listOf(61))
            }
        }
        runBlocking { backend.auth.signInWithEmailAndPassword(email, "secret-1").await() }

        waitForRows(
            listOf(
                "Apples|${created()}",
                "buy milk|Due date: 10/01/2026, 09:30|Overdue|Home|${created()}",
                "Call the bank|Due date: 12/31/2099, 08:00|Home|${created()}",
                "Mars trip|Due date: 10/01/2026, 09:30|Overdue|No Tag|${created()}",
            ),
        )
        compose.onNodeWithTag("tab_active").assertTextEquals("Active Tasks (4)")
        compose.onNodeWithTag("tab_done").assertTextEquals("Completed Tasks (1)")
        compose.onNodeWithTag("tab_deleted").assertTextEquals("Deleted Tasks (1)")
        compose.onNodeWithTag("tab_planned").assertTextEquals("Planned Tasks (1)")
        compose.onNodeWithTag("invalid").assertTextEquals("Documents that failed the check: 1")
        // The filter of the web hides the category Work.
        compose.onNodeWithTag("filter").assertIsSelected()
        screenshot("list-en-light")

        tab("done")
        waitForRows(listOf("Done before|Home|${created()}"))
        tab("deleted")
        waitForRows(listOf("Old note|${created("2026-10-02T08:00:00Z")}|Deleted: ${listDateTime(Instant.parse("2026-10-02T08:00:00Z"), here, Language.EN)}"))
        compose.onNodeWithTag("trash_note").assertTextEquals("⚠️ Deleted tasks will be permanently removed after 30 days")
        tab("planned")
        waitForRows(listOf("Call the bank|Due date: 12/31/2099, 08:00|Home|${created()}"))

        // Another device adds a task: the list takes it in at its place.
        tab("active")
        runBlocking { web.task(uid, "t9", "Aardvark", "home", updatedAt = "2026-10-02T08:00:00Z") }
        compose.waitUntil(60_000) { rows().firstOrNull() == "Aardvark|Home|${created("2026-10-02T08:00:00Z")}" }
        compose.onNodeWithTag("tab_active").assertTextEquals("Active Tasks (5)")
    }

    @Test
    fun theSearchNarrowsTheListAndTheNumbersOfTheTabs() {
        val email = newEmail()
        runBlocking {
            webAccount(email, defaultSettings("en").copy(listSort = ListSort(SortField.TITLE, SortOrder.ASC))).also { uid ->
                web.category(uid, "farm", "Milk farm", "#46a549")
                web.task(uid, "t1", "Buy bread", null, description = "- [ ] milk\n- [x] butter")
                web.task(uid, "t2", "MILK the cow", null)
                web.task(uid, "t3", "Call the vet", "farm")
                web.task(uid, "t4", "Walk", null)
                web.task(uid, "t5", "Milkshake", null, status = "done")
            }
        }
        runBlocking { backend.auth.signInWithEmailAndPassword(email, "secret-1").await() }
        compose.waitUntil(60_000) { rows().size == 4 }

        compose.onNodeWithTag("search").performTextInput(" milk ")
        // The search key closes the keyboard: under it, the list has room for fewer rows. The
        // number of the tab tells that the search has been applied.
        compose.onNodeWithTag("search").performImeAction()
        compose.waitUntil(60_000) { label("tab_active") == "Active Tasks (3)" }
        waitForRows(listOf("Buy bread|${created()}", "Call the vet|Milk farm|${created()}", "MILK the cow|${created()}"))
        compose.onNodeWithTag("tab_done").assertTextEquals("Completed Tasks (1)")

        // The tab and the search stay when the screen is made again, as after a turn of the phone.
        tab("done")
        waitForRows(listOf("Milkshake|${created()}"))
        compose.activityRule.scenario.recreate()
        waitForRows(listOf("Milkshake|${created()}"))
        compose.onNodeWithTag("search").assertTextContains(" milk ")

        tab("active")
        compose.onNodeWithTag("search_clear").performClick()
        compose.waitUntil(60_000) { rows().size == 4 }
        compose.onNodeWithTag("tab_active").assertTextEquals("Active Tasks (4)")
    }

    @Test
    fun theSortAndTheFilterAreTheSettingsTheWebReads() {
        val email = newEmail()
        val uid = runBlocking {
            // As the web keeps it by default: the latest change first, every category.
            webAccount(email, defaultSettings("en")).also { uid ->
                web.category(uid, "home", "Home", "#46a549")
                web.category(uid, "work", "Work", "#da3833", order = 2)
                web.task(uid, "a", "Alpha", "home", updatedAt = "2026-10-01T08:00:00Z")
                web.task(uid, "b", "Beta", "work", updatedAt = "2026-10-03T08:00:00Z")
                web.task(uid, "c", "Gamma", null, updatedAt = "2026-10-02T08:00:00Z")
            }
        }
        runBlocking { backend.auth.signInWithEmailAndPassword(email, "secret-1").await() }
        val alpha = "Alpha|Home|${created()}"
        val beta = "Beta|Work|${created("2026-10-03T08:00:00Z")}"
        val gamma = "Gamma|${created("2026-10-02T08:00:00Z")}"
        waitForRows(listOf(beta, gamma, alpha))
        compose.onNodeWithTag("filter").assertIsNotSelected()

        compose.onNodeWithTag("sort").performClick()
        compose.onNodeWithTag("sort_title").performClick()
        waitForRows(listOf(gamma, beta, alpha))
        compose.onNodeWithTag("sort_order").performClick()
        waitForRows(listOf(alpha, beta, gamma))
        compose.waitUntil(60_000) { storedSettings(uid)["listSort"] == mapOf("by" to "title", "order" to "asc") }

        compose.onNodeWithTag("filter").performClick()
        compose.onNodeWithTag("filter_work").assertIsOn().assertTextContains("1", substring = true)
        compose.onNodeWithTag("filter_work").performClick()
        waitForRows(listOf(alpha, gamma))
        compose.onNodeWithTag("filter_work").assertIsOff()
        compose.waitUntil(60_000) {
            storedSettings(uid)["listFilter"] == mapOf("categoryIds" to listOf("home"), "showUncategorized" to true)
        }
        compose.onNodeWithTag("filter_none").performClick()
        waitForRows(listOf(alpha))
        compose.onNodeWithTag("filter_clear").performClick()
        waitForRows(emptyList())
        compose.onNodeWithTag("empty").assertTextEquals("No active tasks")
        compose.waitUntil(60_000) {
            storedSettings(uid)["listFilter"] == mapOf("categoryIds" to emptyList<String>(), "showUncategorized" to false)
        }
        compose.onNodeWithTag("filter_all").performClick()
        waitForRows(listOf(alpha, beta, gamma))
        // Every category chosen is null again, so the categories made later show too.
        compose.waitUntil(60_000) { storedSettings(uid)["listFilter"] == mapOf("categoryIds" to null, "showUncategorized" to true) }
    }

    @Test
    fun anotherSortStartsTheListAtItsTopAndATaskAddedThereShows() {
        val email = newEmail()
        val uid = runBlocking {
            webAccount(email, defaultSettings("en").copy(listSort = ListSort(SortField.TITLE, SortOrder.ASC))).also { uid ->
                // More tasks than the screen holds.
                (1..15).forEach { web.task(uid, "t$it", "Task %02d".format(it), null) }
            }
        }
        runBlocking { backend.auth.signInWithEmailAndPassword(email, "secret-1").await() }
        compose.waitUntil(60_000) { rows().firstOrNull() == "Task 01|${created()}" }

        // The list shows the new order from its top, not the row that was first, now at the end.
        compose.onNodeWithTag("sort_order").performClick()
        compose.waitUntil(60_000) { rows().firstOrNull() == "Task 15|${created()}" }

        // A task another device adds at the top of the order shows at the top of the list.
        runBlocking { web.task(uid, "t16", "Task 99", null) }
        compose.waitUntil(60_000) { rows().firstOrNull() == "Task 99|${created()}" }
    }

    @Test
    fun theListSpeaksTheLanguageOfTheAccountInItsTheme() {
        val email = newEmail()
        runBlocking {
            // As the web keeps it by default: the latest change first.
            webAccount(email, defaultSettings("uk").copy(themeMode = ThemeMode.DARK)).also { uid ->
                web.category(uid, "home", "Дім", "#46a549")
                web.task(uid, "t1", "Купити хліб", "home", Due("2026-10-01T09:30", here), updatedAt = "2026-10-02T08:00:00Z")
                web.task(uid, "t2", "Зателефонувати", null, Due("2099-12-31T08:00", here), updatedAt = "2026-10-01T08:00:00Z")
            }
        }
        runBlocking { backend.auth.signInWithEmailAndPassword(email, "secret-1").await() }

        // The account's theme and language recreate the screen: the rows are checked, and shot, on the new one.
        compose.waitUntil(60_000) { darkScreen() }
        waitForRows(
            listOf(
                "Купити хліб|Термін виконання: 01.10.2026, 09:30|Прострочено|Дім|${created("2026-10-02T08:00:00Z", Language.UK)}",
                "Зателефонувати|Термін виконання: 31.12.2099, 08:00|${created(language = Language.UK)}",
            ),
        )
        compose.onNodeWithTag("tab_active").assertTextEquals("Активні завдання (2)")
        compose.onNodeWithTag("tab_planned").assertTextEquals("Відкладені завдання (1)")
        screenshot("list-uk-dark")
    }
}
