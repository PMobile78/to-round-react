package com.pmobile78.todoround

import android.content.res.Configuration
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ComposeTimeoutException
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.core.os.LocaleListCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.ListFilter
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.data.Backend
import com.pmobile78.todoround.data.SettingsRepository
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
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
 * and the app, signed in as the same user, shows them as the web's "Active" tab (spec, section 7).
 */
@RunWith(AndroidJUnit4::class)
class ListFlowTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private val backend = emulatorBackend()
    private val web = webBackend()

    // A due in the zone of this device shows as written.
    private val here = ZoneId.systemDefault().id

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
    private suspend fun Backend.category(uid: String, id: String, name: String, color: String) {
        val data = mapOf(
            "schemaVersion" to 2,
            "name" to name,
            "color" to color,
            "order" to 1,
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
    ) {
        val time = Timestamp(Instant.parse(updatedAt))
        val data = mapOf(
            "schemaVersion" to 2,
            "title" to title,
            "description" to "",
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
            "deletedAt" to null,
        )
        db.document("users/$uid/tasks/$id").set(data).await()
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
    fun theListIsTheActiveTabOfTheWebAndChangesLive() {
        val email = newEmail()
        val uid = runBlocking {
            // The web shows this account the category Home and the tasks without one, sorted by title.
            val settings = defaultSettings("en").copy(
                listFilter = ListFilter(categoryIds = listOf("home"), showUncategorized = true),
                listSort = ListSort(SortField.TITLE, SortOrder.ASC),
            )
            webAccount(email, settings).also { uid ->
                web.category(uid, "home", "Home", "#46a549")
                web.category(uid, "work", "Work", "#da3833")
                web.task(uid, "t1", "buy milk", "home", Due("2026-10-01T09:30", here))
                web.task(uid, "t2", "Call the bank", "home", Due("2099-12-31T08:00", here))
                web.task(uid, "t3", "Apples", null)
                web.task(uid, "t4", "Mars trip", "gone", Due("2026-10-23T09:30", "Mars/Olympus_Mons"))
                web.task(uid, "t5", "Report", "work")
                web.task(uid, "t6", "Done before", "home", status = "done")
                // The rules leave the elements of reminders to the clients; the core wants whole hours.
                // The web shows such a task, the app only counts it (spec 6).
                web.task(uid, "t7", "Odd", null, Due("2026-10-01T09:30", "UTC"), reminders = listOf(61))
            }
        }
        runBlocking { backend.auth.signInWithEmailAndPassword(email, "secret-1").await() }

        waitForRows(
            listOf(
                "Apples",
                "buy milk|Due date: 10/01/2026, 09:30|Overdue|Home",
                "Call the bank|Due date: 12/31/2099, 08:00|Home",
                "Mars trip|Due date: 10/23/2026, 09:30|No Tag",
            ),
        )
        compose.onNodeWithTag("count").assertTextEquals("Active Tasks (4)")
        compose.onNodeWithTag("shown").assertTextEquals("Showing 4 of 5")
        compose.onNodeWithTag("invalid").assertTextEquals("Documents that failed the check: 1")
        screenshot("list-en-light")

        // Another device adds a task: the list takes it in at its place.
        runBlocking { web.task(uid, "t8", "Aardvark", "home", updatedAt = "2026-10-02T08:00:00Z") }
        compose.waitUntil(60_000) { rows().firstOrNull() == "Aardvark|Home" }
        compose.onNodeWithTag("count").assertTextEquals("Active Tasks (5)")
        compose.onNodeWithTag("shown").assertTextEquals("Showing 5 of 6")
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
                "Купити хліб|Термін виконання: 01.10.2026, 09:30|Прострочено|Дім",
                "Зателефонувати|Термін виконання: 31.12.2099, 08:00",
            ),
        )
        compose.onNodeWithTag("count").assertTextEquals("Активні завдання (2)")
        compose.onAllNodesWithTag("shown").assertCountEquals(0)
        screenshot("list-uk-dark")
    }
}
