package com.pmobile78.todoround

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestoreException
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.ListFilter
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.NEW_TASK_FORM
import com.pmobile78.todoround.core.model.Repeat
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.TaskAction
import com.pmobile78.todoround.core.model.changeErrors
import com.pmobile78.todoround.core.model.changes
import com.pmobile78.todoround.core.model.completionChanges
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.descriptionChanges
import com.pmobile78.todoround.core.model.formChanges
import com.pmobile78.todoround.core.model.newTaskErrors
import com.pmobile78.todoround.core.model.newTaskFields
import com.pmobile78.todoround.core.model.toForm
import com.pmobile78.todoround.core.model.toRecord
import com.pmobile78.todoround.core.model.withoutDue
import com.pmobile78.todoround.data.CategoriesRepository
import com.pmobile78.todoround.data.SettingsRepository
import com.pmobile78.todoround.data.TasksRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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
    fun aNewTaskIsWrittenAsTheWebWritesItAndPassesTheRules() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            val repository = TasksRepository(backend.db)
            val form = NEW_TASK_FORM.copy(
                title = " Water the plants ",
                description = "- [ ] the big pot",
                categoryId = "c1",
                due = "2026-11-02T09:30",
                reminders = listOf(1440, 60),
                repeat = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(5, 1)),
                radius = 60,
            )
            val fields = newTaskFields(form, "Europe/Kyiv")
            val id = repository.newId(uid)
            assertEquals(emptyList<String>(), newTaskErrors(id, fields, Instant.now()))
            repository.create(uid, id, fields)

            val task = readBack(uid, id) { true }
            assertEquals(
                Task(
                    id = id,
                    title = "Water the plants",
                    description = "- [ ] the big pot",
                    categoryId = "c1",
                    status = TaskStatus.ACTIVE,
                    due = Due("2026-11-02T09:30", "Europe/Kyiv"),
                    reminders = listOf(60, 1440),
                    repeat = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(1, 5)),
                    radius = 60,
                    pulseMuted = false,
                    createdAt = task.createdAt,
                    updatedAt = task.updatedAt,
                    deletedAt = null,
                ),
                task,
            )
            // The fields of the server: overdueAt is null, nextNotifyAt is for Cloud Functions, both times are the server's.
            val doc = backend.db.document("users/$uid/tasks/$id").fromServer()
            assertEquals(2L, doc.getLong("schemaVersion"))
            assertTrue(doc.contains("overdueAt") && doc.get("overdueAt") == null)
            assertFalse(doc.contains("nextNotifyAt"))
            assertEquals(doc.getTimestamp("createdAt"), doc.getTimestamp("updatedAt"))

            // A title alone, as a new form gives it: no due, reminders, repeat or category, and the size 45.
            val plain = repository.newId(uid)
            repository.create(uid, plain, newTaskFields(NEW_TASK_FORM.copy(title = "Call mum"), "Europe/Kyiv"))
            val called = readBack(uid, plain) { true }
            assertEquals(listOf(null, emptyList<Int>(), null, null, 45), listOf(called.due, called.reminders, called.repeat, called.categoryId, called.radius))
        }
    }

    @Test
    fun theChangesOfTheFormAreWrittenAsTheWebWritesThemAndPassTheRules() = runBlocking {
        withTimeout(120_000) {
            val uid = backend.signUpNewUser()
            val repository = TasksRepository(backend.db)
            // A monthly task of the 31st that "Done" moved to the 30th, its pulse stopped.
            write(
                "users/$uid/tasks/t1",
                webTask("Rent", mapOf("local" to "2026-11-30T09:00", "tz" to "Europe/Kyiv"), listOf(60), mapOf("every" to 1, "unit" to "months", "monthDay" to 31)) +
                    ("pulseMuted" to true),
            )
            var task = readBack(uid, "t1") { true }

            // Every field but the due, on a phone in Tokyo: the due and its zone, the month day and the stopped pulse stay.
            var opened = task.toForm("Asia/Tokyo")
            val edited = opened.copy(
                title = "Pay rent",
                description = "**soon**",
                categoryId = null,
                reminders = listOf(2880, 60),
                repeat = Repeat(2, RepeatUnit.MONTHS),
                radius = 70,
            )
            val changes = formChanges(task, opened, edited, "Asia/Tokyo")
            assertEquals(emptyList<String>(), changeErrors(task, changes, Instant.now()))
            repository.update(uid, "t1", changes)
            task = readBack(uid, "t1") { it.title == "Pay rent" }
            assertEquals(
                listOf("**soon**", null, Due("2026-11-30T09:00", "Europe/Kyiv"), listOf(60, 2880), Repeat(2, RepeatUnit.MONTHS, monthDay = 31), 70, true),
                listOf(task.description, task.categoryId, task.due, task.reminders, task.repeat, task.radius, task.pulseMuted),
            )

            // A new due: the zone of the phone, the day of the monthly repeat from it, and the pulse again.
            opened = task.toForm("Asia/Tokyo")
            repository.update(uid, "t1", formChanges(task, opened, opened.copy(due = "2026-12-15T10:00"), "Asia/Tokyo"))
            task = readBack(uid, "t1") { it.due?.tz == "Asia/Tokyo" }
            assertEquals(
                listOf(Due("2026-12-15T10:00", "Asia/Tokyo"), Repeat(2, RepeatUnit.MONTHS, monthDay = 15), false),
                listOf(task.due, task.repeat, task.pulseMuted),
            )

            // No due: the reminders and the repeat go with it.
            opened = task.toForm("Asia/Tokyo")
            repository.update(uid, "t1", formChanges(task, opened, opened.withoutDue(), "Asia/Tokyo"))
            task = readBack(uid, "t1") { it.due == null }
            assertEquals(listOf(emptyList<Int>(), null), listOf(task.reminders, task.repeat))
        }
    }

    @Test
    fun aTaskWhoseRepeatChangesUnitStaysReadableBeforeTheServerAnswers() = runBlocking {
        withTimeout(120_000) {
            val uid = backend.signUpNewUser()
            // As EditFlowTest changes every field of a weekly task of Mondays with two reminders, its pulse stopped.
            write(
                "users/$uid/tasks/t1",
                webTask("Rent", mapOf("local" to "2026-11-30T09:00", "tz" to "Europe/Kyiv"), listOf(60, 1440), mapOf("every" to 1, "unit" to "weeks", "weekdays" to listOf(1))) +
                    mapOf("description" to "pay", "pulseMuted" to true),
            )
            var task = readBack(uid, "t1") { true }
            var opened = task.toForm("Europe/Kyiv")
            val monthly = opened.copy(
                title = "Pay rent",
                description = "pay **soon**",
                categoryId = null,
                due = "2026-12-15T10:00",
                reminders = listOf(60),
                repeat = opened.repeat!!.copy(unit = RepeatUnit.MONTHS),
                radius = 70,
            )
            // The weekdays go with the weeks.
            assertEquals(Repeat(1, RepeatUnit.MONTHS, monthDay = 15), writtenOffline(uid, "t1", formChanges(task, opened, monthly, "Europe/Kyiv")) { it.title == "Pay rent" }.repeat)
            task = readBack(uid, "t1") { it.title == "Pay rent" }
            assertEquals(Repeat(1, RepeatUnit.MONTHS, monthDay = 15), task.repeat)

            // Weeks again, on Mondays and Fridays: the month day goes with the months.
            opened = task.toForm("Europe/Kyiv")
            val weekly = opened.copy(repeat = Repeat(1, RepeatUnit.WEEKS, listOf(1, 5)))
            assertEquals(Repeat(1, RepeatUnit.WEEKS, listOf(1, 5)), writtenOffline(uid, "t1", formChanges(task, opened, weekly, "Europe/Kyiv")) { it.repeat?.unit == RepeatUnit.WEEKS }.repeat)
            task = readBack(uid, "t1") { it.repeat?.unit == RepeatUnit.WEEKS }
            assertEquals(Repeat(1, RepeatUnit.WEEKS, listOf(1, 5)), task.repeat)

            // No repeat, then every 2 days: a repeat written key by key onto none.
            opened = task.toForm("Europe/Kyiv")
            assertEquals(null, writtenOffline(uid, "t1", formChanges(task, opened, opened.copy(repeat = null), "Europe/Kyiv")) { it.repeat == null }.repeat)
            task = readBack(uid, "t1") { it.repeat == null }
            opened = task.toForm("Europe/Kyiv")
            val daily = opened.copy(repeat = Repeat(2, RepeatUnit.DAYS))
            assertEquals(Repeat(2, RepeatUnit.DAYS), writtenOffline(uid, "t1", formChanges(task, opened, daily, "Europe/Kyiv")) { it.repeat != null }.repeat)
            assertEquals(Repeat(2, RepeatUnit.DAYS), readBack(uid, "t1") { it.repeat != null }.repeat)
        }
    }

    // The task [id] as the phone shows it once [changes] are written offline, before the server has them, [until] that:
    // the core takes it, or this fails. Then the phone is online again and the server takes the write.
    private suspend fun writtenOffline(uid: String, id: String, changes: Map<String, Any?>, until: (Task) -> Boolean): Task = coroutineScope {
        val repository = TasksRepository(backend.db)
        backend.db.disableNetwork().await()
        try {
            val sent = async { repository.update(uid, id, changes) }
            val shown = repository.tasks(uid).first { loaded -> loaded.invalid > 0 || loaded.items.any { it.id == id && until(it) } }
            assertEquals(0, shown.invalid)
            backend.db.enableNetwork().await()
            sent.await()
            shown.items.single { it.id == id }
        } finally {
            backend.db.enableNetwork().await()
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
