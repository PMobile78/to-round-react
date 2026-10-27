package com.pmobile78.todoround.data

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.pmobile78.todoround.core.contract.Design
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.contract.validateDevice
import com.pmobile78.todoround.core.contract.validateTask
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.ListFilter
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.Repeat
import com.pmobile78.todoround.core.model.ServerTime
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.categoryFromRecord
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.taskFromRecord
import com.pmobile78.todoround.core.model.toRecord
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.time.Instant

class DocumentsTest {
    private val created = Instant.parse("2026-10-20T08:00:00.123456Z")
    private val updated = Instant.parse("2026-10-21T09:30:00Z")

    // A task as Firestore gives it to Android after the web wrote it: whole numbers are Long,
    // times are Timestamps, and the fields of the server are there too.
    private val webTask = mapOf<String, Any?>(
        "schemaVersion" to 2L,
        "title" to "Buy milk",
        "description" to "",
        "categoryId" to "c1",
        "status" to "active",
        "due" to mapOf("local" to "2026-10-23T09:30", "tz" to "Europe/Kyiv"),
        "reminders" to listOf(60L, 1440L),
        "repeat" to mapOf("every" to 2L, "unit" to "weeks", "weekdays" to listOf(1L, 3L)),
        "radius" to 45L,
        "pulseMuted" to false,
        "overdueAt" to null,
        "nextNotifyAt" to Timestamp(Instant.parse("2026-10-23T05:30:00Z")),
        "createdAt" to Timestamp(created),
        "updatedAt" to Timestamp(updated),
        "deletedAt" to null,
    )

    @Test
    fun `a task document of the web becomes the task`() {
        assertEquals(
            Task(
                id = "t1",
                title = "Buy milk",
                description = "",
                categoryId = "c1",
                status = TaskStatus.ACTIVE,
                due = Due("2026-10-23T09:30", "Europe/Kyiv"),
                reminders = listOf(60, 1440),
                repeat = Repeat(every = 2, unit = RepeatUnit.WEEKS, weekdays = listOf(1, 3)),
                radius = 45,
                pulseMuted = false,
                createdAt = created,
                updatedAt = updated,
                deletedAt = null,
            ),
            taskFromRecord(taskRecord("t1", webTask), acceptUnknownZone = true),
        )
    }

    @Test
    fun `the fields of the server stay out of the record`() {
        assertEquals(
            setOf(
                "id", "title", "description", "categoryId", "status", "due", "reminders", "repeat", "radius",
                "pulseMuted", "createdAt", "updatedAt", "deletedAt",
            ),
            taskRecord("t1", webTask).keys,
        )
    }

    @Test
    fun `server times become ISO strings to the microsecond`() {
        val record = taskRecord("t1", webTask)
        assertEquals("2026-10-20T08:00:00.123456Z", record["createdAt"])
        assertEquals("2026-10-21T09:30:00Z", record["updatedAt"])
        assertNull(record["deletedAt"])
    }

    @Test
    fun `a field the document lacks stays missing, unlike a null`() {
        val withoutCategory = taskRecord("t1", webTask - "categoryId")
        assertFalse(withoutCategory.containsKey("categoryId"))
        assertEquals(listOf("categoryId: invalid"), validateTask(withoutCategory))

        val uncategorized = taskRecord("t1", webTask + ("categoryId" to null))
        assertTrue(uncategorized.containsKey("categoryId"))
        assertEquals(emptyList<String>(), validateTask(uncategorized))
    }

    @Test
    fun `a value of a wrong type is left for the core to refuse`() {
        assertEquals(listOf("createdAt: invalid"), validateTask(taskRecord("t1", webTask + ("createdAt" to "yesterday"))))
    }

    @Test
    fun `a category keeps its name, colour and order, whole or not`() {
        val serverFields = mapOf("schemaVersion" to 2L, "createdAt" to Timestamp(created), "updatedAt" to Timestamp(updated))
        val home = categoryRecord("c1", serverFields + mapOf("name" to "Home", "color" to "#46a549", "order" to 1.5))
        assertEquals(setOf("id", "name", "color", "order"), home.keys)
        assertEquals(Category("c1", "Home", "#46a549", 1.5), categoryFromRecord(home))

        val work = categoryRecord("c2", serverFields + mapOf("name" to "Work", "color" to "#da3833", "order" to 3L))
        assertEquals(3.0, categoryFromRecord(work).order)
    }

    @Test
    fun `settings of the user document are read as they are`() {
        val stored = defaultSettings("uk").copy(
            themeMode = ThemeMode.DARK,
            design = Design.AURORA,
            labelFontSize = 12,
            listSort = ListSort(SortField.TITLE, SortOrder.ASC),
        )
        assertEquals(stored, settingsFromUserDoc(mapOf("settings" to stored.toRecord()), screenLanguage = "en"))
    }

    @Test
    fun `without a user document the settings are the defaults in the language of the screen`() {
        assertEquals(defaultSettings("uk"), settingsFromUserDoc(null, screenLanguage = "uk"))
    }

    @Test
    fun `a value this version does not know takes its default and the others stay`() {
        val record = defaultSettings("uk").copy(themeMode = ThemeMode.DARK).toRecord() +
            mapOf("design" to "neon", "labelFontSize" to "12")
        val settings = settingsFromUserDoc(mapOf("settings" to record), screenLanguage = "en")
        assertEquals(Design.CLASSIC, settings.design)
        assertEquals(8, settings.labelFontSize)
        assertEquals(ThemeMode.DARK, settings.themeMode)
        assertEquals(Language.UK, settings.language)
    }

    @Test
    fun `a missing setting takes its default`() {
        val record = defaultSettings("uk").copy(listSort = ListSort(SortField.TITLE, SortOrder.ASC)).toRecord() - "listSort"
        assertEquals(
            ListSort(SortField.UPDATED_AT, SortOrder.DESC),
            settingsFromUserDoc(mapOf("settings" to record), screenLanguage = "en").listSort,
        )
    }

    @Test
    fun `a new user document has schema 2, the settings and server times`() {
        val settings = defaultSettings("uk")
        assertEquals(
            mapOf(
                "schemaVersion" to 2,
                "settings" to settings.toRecord(),
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp(),
            ),
            newUserDoc(settings),
        )
    }

    @Test
    fun `the list's sort and filter are written as the web's updateSettings writes them`() {
        assertEquals(
            mapOf("settings.listSort" to mapOf("by" to "category", "order" to "asc"), "updatedAt" to FieldValue.serverTimestamp()),
            listSortUpdate(ListSort(SortField.CATEGORY, SortOrder.ASC)),
        )
        assertEquals(
            mapOf(
                "settings.listFilter" to mapOf("categoryIds" to listOf("c2", "c1"), "showUncategorized" to false),
                "updatedAt" to FieldValue.serverTimestamp(),
            ),
            listFilterUpdate(ListFilter(listOf("c2", "c1"), showUncategorized = false)),
        )
        // Every category is null, not a list.
        assertEquals(
            mapOf("categoryIds" to null, "showUncategorized" to true),
            listFilterUpdate(ListFilter(null, showUncategorized = true))["settings.listFilter"],
        )
    }

    @Test
    fun `a change of a task is its fields, the time of the server for ServerTime, and updatedAt`() {
        assertEquals(
            mapOf("status" to "deleted", "deletedAt" to FieldValue.serverTimestamp(), "updatedAt" to FieldValue.serverTimestamp()),
            taskUpdate(mapOf("status" to "deleted", "deletedAt" to ServerTime)),
        )
        assertEquals(
            mapOf("status" to "active", "deletedAt" to null, "updatedAt" to FieldValue.serverTimestamp()),
            taskUpdate(mapOf("status" to "active", "deletedAt" to null)),
        )
        // "Done" of a repeating task: the due as a map of the contract, and the pulse on again.
        assertEquals(
            mapOf(
                "due" to mapOf("local" to "2026-10-25T09:00", "tz" to "Europe/Kyiv"),
                "pulseMuted" to false,
                "updatedAt" to FieldValue.serverTimestamp(),
            ),
            taskUpdate(mapOf("due" to mapOf("local" to "2026-10-25T09:00", "tz" to "Europe/Kyiv"), "pulseMuted" to false)),
        )
        assertEquals(mapOf("description" to "- [x] milk", "updatedAt" to FieldValue.serverTimestamp()), taskUpdate(mapOf("description" to "- [x] milk")))
    }

    @Test
    fun `a new device is this phone with notifications on, and the contract takes its record`() {
        assertEquals(
            mapOf(
                "platform" to "android",
                "fcmToken" to "fid-1",
                "notificationsEnabled" to true,
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp(),
            ),
            newDeviceDoc("fid-1"),
        )
        // The record of the document once the server has put in its times.
        for (address in listOf("fid-1", null)) {
            val doc: Map<String, Any?> = newDeviceDoc(address)
            val record = doc.mapValues { if (it.value is FieldValue) "2026-10-24T10:00:00Z" else it.value } + ("id" to "fid-1")
            assertEquals(emptyList<String>(), validateDevice(record))
        }
    }

    @Test
    fun `a known device changes only its address, and the switch stays as it is`() {
        assertEquals(mapOf("fcmToken" to "fid-2", "updatedAt" to FieldValue.serverTimestamp()), deviceAddressUpdate("fid-2"))
        assertEquals(mapOf("fcmToken" to null, "updatedAt" to FieldValue.serverTimestamp()), deviceAddressUpdate(null))
    }
}
