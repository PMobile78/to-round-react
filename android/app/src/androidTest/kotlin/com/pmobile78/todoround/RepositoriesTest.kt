package com.pmobile78.todoround

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestoreException
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.ListFilter
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.TaskAction
import com.pmobile78.todoround.core.model.changes
import com.pmobile78.todoround.core.model.completionChanges
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.descriptionChanges
import com.pmobile78.todoround.core.model.toRecord
import com.pmobile78.todoround.data.CategoriesRepository
import com.pmobile78.todoround.data.SettingsRepository
import com.pmobile78.todoround.data.TasksRepository
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant

/** The repositories on the Firestore emulator, under the rules of the repository. */
@RunWith(AndroidJUnit4::class)
class RepositoriesTest {
    private val backend = emulatorBackend()

    // A task as the web's newTaskData writes it (src/services/data/convert.js).
    private fun webTask(title: String, due: Map<String, Any>?, reminders: List<Int>, repeat: Map<String, Any>? = null) = mapOf(
        "schemaVersion" to 2,
        "title" to title,
        "description" to "",
        "categoryId" to "c1",
        "status" to "active",
        "due" to due,
        "reminders" to reminders,
        "repeat" to repeat,
        "radius" to 45,
        "pulseMuted" to false,
        "overdueAt" to null,
        "createdAt" to FieldValue.serverTimestamp(),
        "updatedAt" to FieldValue.serverTimestamp(),
        "deletedAt" to null,
    )

    private suspend fun write(path: String, data: Map<String, Any?>) {
        backend.db.document(path).set(data).await()
    }

    @Test
    fun aTaskAndACategoryWrittenByTheWebAreRead() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            write(
                "users/$uid/categories/c1",
                mapOf(
                    "schemaVersion" to 2,
                    "name" to "Home",
                    "color" to "#46a549",
                    "order" to 1.5,
                    "createdAt" to FieldValue.serverTimestamp(),
                    "updatedAt" to FieldValue.serverTimestamp(),
                ),
            )
            write("users/$uid/tasks/t1", webTask("Buy milk", mapOf("local" to "2026-10-23T09:30", "tz" to "Europe/Kyiv"), listOf(60)))

            val tasks = TasksRepository(backend.db).tasks(uid).first { !it.fromCache && it.items.isNotEmpty() }
            val task = tasks.items.single()
            assertEquals(0, tasks.invalid)
            assertEquals("t1", task.id)
            assertEquals("Buy milk", task.title)
            assertEquals(TaskStatus.ACTIVE, task.status)
            assertEquals(Due("2026-10-23T09:30", "Europe/Kyiv"), task.due)
            assertEquals(listOf(60), task.reminders)
            assertEquals(task.createdAt, task.updatedAt)

            val categories = CategoriesRepository(backend.db).categories(uid).first { !it.fromCache && it.items.isNotEmpty() }
            assertEquals(listOf(Category("c1", "Home", "#46a549", 1.5)), categories.items)
        }
    }

    @Test
    fun aDocumentTheCoreRefusesIsCountedNotShown() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            write("users/$uid/tasks/good", webTask("Good", null, emptyList()))
            // The rules leave the elements of reminders to the clients; the core wants whole hours.
            write("users/$uid/tasks/odd", webTask("Odd", mapOf("local" to "2026-10-23T09:30", "tz" to "UTC"), listOf(61)))

            val tasks = TasksRepository(backend.db).tasks(uid).first { !it.fromCache && it.items.size + it.invalid == 2 }
            assertEquals(listOf("good"), tasks.items.map { it.id })
            assertEquals(1, tasks.invalid)
        }
    }

    @Test
    fun aDueZoneThisPhoneDoesNotKnowKeepsTheTask() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            write("users/$uid/tasks/t1", webTask("Far away", mapOf("local" to "2026-10-23T09:30", "tz" to "Mars/Olympus_Mons"), emptyList()))

            val tasks = TasksRepository(backend.db).tasks(uid).first { !it.fromCache && it.items.isNotEmpty() }
            assertEquals(Due("2026-10-23T09:30", "Mars/Olympus_Mons"), tasks.items.single().due)
        }
    }

    @Test
    fun aNewAccountGetsItsUserDocumentInTheLanguageOfTheScreen() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()

            assertEquals(defaultSettings("uk"), SettingsRepository(backend.db).settings(uid, "uk").filterNotNull().first())
            val doc = backend.db.document("users/$uid").fromServer()
            assertEquals(2L, doc.getLong("schemaVersion"))
            assertEquals(defaultSettings("uk").toRecord(), doc.get("settings"))
            assertTrue(doc.get("createdAt") is Timestamp)
            assertEquals(doc.get("createdAt"), doc.get("updatedAt"))
        }
    }

    @Test
    fun theRulesRefuseToReplaceAnExistingUserDocument() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            val settings = SettingsRepository(backend.db)
            settings.settings(uid, "en").filterNotNull().first()

            val refused = runCatching { settings.createUserDoc(uid, defaultSettings("uk")) }
            assertEquals(
                FirebaseFirestoreException.Code.PERMISSION_DENIED,
                (refused.exceptionOrNull() as FirebaseFirestoreException).code,
            )
        }
    }

    @Test
    fun theSortAndTheFilterOfTheListAreWrittenAsTheWebWritesThem() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            val settings = SettingsRepository(backend.db)
            settings.settings(uid, "en").filterNotNull().first()
            backend.db.document("users/$uid").fromServer()

            settings.setListSort(uid, ListSort(SortField.CATEGORY, SortOrder.ASC))
            settings.setListFilter(uid, ListFilter(listOf("c2", "c1"), showUncategorized = false))
            val written = backend.db.document("users/$uid").fromServer()
            assertEquals(mapOf("by" to "category", "order" to "asc"), written.get("settings.listSort"))
            assertEquals(mapOf("categoryIds" to listOf("c2", "c1"), "showUncategorized" to false), written.get("settings.listFilter"))
            // The other settings stay as they were.
            val expected = defaultSettings("en").copy(
                listSort = ListSort(SortField.CATEGORY, SortOrder.ASC),
                listFilter = ListFilter(listOf("c2", "c1"), showUncategorized = false),
            )
            assertEquals(expected.toRecord(), written.get("settings"))

            settings.setListFilter(uid, ListFilter(null, showUncategorized = true))
            assertEquals(
                mapOf("categoryIds" to null, "showUncategorized" to true),
                backend.db.document("users/$uid").fromServer().get("settings.listFilter"),
            )
        }
    }

    @Test
    fun aWriteTheRulesRefuseFailsForTheCaller() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            val settings = SettingsRepository(backend.db)
            settings.settings(uid, "en").filterNotNull().first()
            backend.db.document("users/$uid").fromServer()

            // The rules take at most 100 ids in a filter.
            val refused = runCatching { settings.setListFilter(uid, ListFilter(List(101) { "c$it" }, showUncategorized = true)) }
            assertEquals(
                FirebaseFirestoreException.Code.PERMISSION_DENIED,
                (refused.exceptionOrNull() as FirebaseFirestoreException).code,
            )
        }
    }

    @Test
    fun aSettingChangedByTheWebArrivesLive() = runBlocking {
        withTimeout(60_000) {
            val email = newEmail()
            val uid = backend.signUp(email)
            val settings = SettingsRepository(backend.db)
            settings.settings(uid, "uk").filterNotNull().first()
            backend.db.document("users/$uid").fromServer()
            // The web is another client signed in as the same user: its change comes through the server.
            val web = webBackend()
            web.auth.signInWithEmailAndPassword(email, "secret-1").await()

            val changed = settings.settings(uid, "uk").filterNotNull()
                .onEach {
                    // As the web's updateSettings writes it: one field path and the server time.
                    if (it.language == Language.UK) {
                        web.db.document("users/$uid")
                            .update(mapOf("settings.language" to "en", "updatedAt" to FieldValue.serverTimestamp())).await()
                    }
                }
                .first { it.language == Language.EN }
            assertEquals(defaultSettings("en"), changed)
            web.auth.signOut()
        }
    }

    // The task [id] as the core reads it from the server: it passed the check, or this fails.
    private suspend fun readBack(uid: String, id: String, until: (Task) -> Boolean): Task {
        val tasks = TasksRepository(backend.db).tasks(uid).first { loaded ->
            !loaded.fromCache && loaded.items.any { it.id == id && until(it) }
        }
        assertEquals(0, tasks.invalid)
        return tasks.items.single { it.id == id }
    }

    @Test
    fun theChangesOfEachActionAreWrittenAsTheWebWritesThemAndPassTheRules() = runBlocking {
        withTimeout(120_000) {
            val uid = backend.signUpNewUser()
            val repository = TasksRepository(backend.db)
            // A daily task whose due has passed, its pulse stopped.
            write(
                "users/$uid/tasks/t1",
                webTask("Water", mapOf("local" to "2026-10-01T09:30", "tz" to "Europe/Kyiv"), listOf(60), mapOf("every" to 1, "unit" to "days")) +
                    ("pulseMuted" to true),
            )
            var task = readBack(uid, "t1") { true }
            val created = backend.db.document("users/$uid/tasks/t1").fromServer().getTimestamp("createdAt")

            // Done moves the due to the first time after now and lets the task pulse again.
            val done = completionChanges(task, "Europe/Kyiv", Instant.now())
            repository.update(uid, "t1", done)
            task = readBack(uid, "t1") { it.due?.local == (done["due"] as Map<*, *>)["local"] }
            assertEquals(TaskStatus.ACTIVE, task.status)
            assertEquals(false, task.pulseMuted)
            assertEquals("Europe/Kyiv", task.due?.tz)

            repository.update(uid, "t1", TaskAction.FINISH_SERIES.changes(task, "UTC", Instant.now())!!)
            task = readBack(uid, "t1") { it.status == TaskStatus.DONE }
            repository.update(uid, "t1", TaskAction.RESTORE.changes(task, "UTC", Instant.now())!!)
            task = readBack(uid, "t1") { it.status == TaskStatus.ACTIVE }
            repository.update(uid, "t1", TaskAction.DELETE.changes(task, "UTC", Instant.now())!!)
            task = readBack(uid, "t1") { it.status == TaskStatus.DELETED }
            assertTrue(task.deletedAt != null)
            repository.update(uid, "t1", TaskAction.RESTORE.changes(task, "UTC", Instant.now())!!)
            task = readBack(uid, "t1") { it.status == TaskStatus.ACTIVE && it.deletedAt == null }
            repository.update(uid, "t1", descriptionChanges("- [x] the big pot"))
            task = readBack(uid, "t1") { it.description == "- [x] the big pot" }

            // The document keeps its time of creation and the fields of the server; updatedAt is the server's.
            val doc = backend.db.document("users/$uid/tasks/t1").fromServer()
            assertEquals(2L, doc.getLong("schemaVersion"))
            assertEquals(created, doc.getTimestamp("createdAt"))
            assertEquals(null, doc.get("overdueAt"))
            assertTrue(doc.getTimestamp("updatedAt")!! > created!!)
            assertEquals("- [x] the big pot", task.description)
        }
    }

    @Test
    fun deleteForeverRemovesTheTask() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            write("users/$uid/tasks/t1", webTask("Old", null, emptyList()))
            backend.db.document("users/$uid/tasks/t1").fromServer()

            TasksRepository(backend.db).delete(uid, "t1")
            assertEquals(false, backend.db.document("users/$uid/tasks/t1").fromServer().exists())
        }
    }

    @Test
    fun aChangeOfATaskDeletedForeverFailsForTheCaller() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            // The rules check the task the change would leave: with no document there is none.
            val refused = runCatching { TasksRepository(backend.db).update(uid, "gone", mapOf("status" to "done")) }
            assertEquals(
                FirebaseFirestoreException.Code.PERMISSION_DENIED,
                (refused.exceptionOrNull() as FirebaseFirestoreException).code,
            )
        }
    }
}
