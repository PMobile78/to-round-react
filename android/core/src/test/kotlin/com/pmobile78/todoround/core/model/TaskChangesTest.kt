package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.TaskStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import java.time.Instant

/** The changes the phone writes, as the web's src/services/data/tasks.js writes them. */
class TaskChangesTest {
    private val now = Instant.parse("2026-10-24T12:00:00Z")

    private fun task(
        due: Due? = null,
        repeat: Repeat? = null,
        pulseMuted: Boolean = false,
        status: TaskStatus = TaskStatus.ACTIVE,
    ) = Task(
        id = "t1",
        title = "Water the plants",
        description = "",
        categoryId = null,
        status = status,
        due = due,
        reminders = emptyList(),
        repeat = repeat,
        radius = 45,
        pulseMuted = pulseMuted,
        createdAt = Instant.parse("2026-10-01T08:00:00Z"),
        updatedAt = Instant.parse("2026-10-01T08:00:00Z"),
        deletedAt = if (status == TaskStatus.DELETED) Instant.parse("2026-10-02T08:00:00Z") else null,
    )

    private val daily = Repeat(every = 1, unit = RepeatUnit.DAYS)

    @Test
    fun `done of a one-off task, with a due or without, is the status done`() {
        assertEquals(mapOf("status" to "done"), completionChanges(task(), "UTC", now))
        assertEquals(mapOf("status" to "done"), completionChanges(task(due = Due("2026-10-20T09:00", "Europe/Berlin")), "UTC", now))
    }

    @Test
    fun `done of a repeating task moves its due to the first time after now, in the zone of the due`() {
        // 09:00 in Berlin is 07:00 UTC: on the 24th it has passed at 12:00 UTC, so the 25th.
        val overdue = task(due = Due("2026-10-20T09:00", "Europe/Berlin"), repeat = daily)
        assertEquals(mapOf("due" to mapOf("local" to "2026-10-25T09:00", "tz" to "Europe/Berlin")), completionChanges(overdue, "Asia/Tokyo", now))
        // A due still ahead moves one step.
        val ahead = task(due = Due("2026-10-30T09:00", "Europe/Berlin"), repeat = daily)
        assertEquals(mapOf("due" to mapOf("local" to "2026-10-31T09:00", "tz" to "Europe/Berlin")), completionChanges(ahead, "UTC", now))
    }

    @Test
    fun `done of a repeating task whose pulse was stopped lets it pulse again`() {
        val muted = task(due = Due("2026-10-20T09:00", "UTC"), repeat = daily, pulseMuted = true)
        assertEquals(
            mapOf("due" to mapOf("local" to "2026-10-25T09:00", "tz" to "UTC"), "pulseMuted" to false),
            completionChanges(muted, "UTC", now),
        )
    }

    @Test
    fun `a due zone this phone does not know steps in the zone of the phone and stays written`() {
        // 13:00 in Tokyo is 04:00 UTC: on the 24th it has passed at 12:00 UTC, so the 25th.
        val far = task(due = Due("2026-10-20T13:00", "Mars/Olympus_Mons"), repeat = Repeat(every = 1, unit = RepeatUnit.DAYS))
        assertEquals(mapOf("due" to mapOf("local" to "2026-10-25T13:00", "tz" to "Mars/Olympus_Mons")), completionChanges(far, "Asia/Tokyo", now))
        // 13:00 in Los Angeles is 20:00 UTC: on the 24th it is still ahead.
        assertEquals(mapOf("due" to mapOf("local" to "2026-10-24T13:00", "tz" to "Mars/Olympus_Mons")), completionChanges(far, "America/Los_Angeles", now))
    }

    @Test
    fun `the actions of a task are the web's buttons for its status, the first one its row's`() {
        assertEquals(listOf(TaskAction.DONE, TaskAction.DELETE), task().actions())
        assertEquals(listOf(TaskAction.DONE, TaskAction.FINISH_SERIES, TaskAction.DELETE), task(due = Due("2026-10-20T09:00", "UTC"), repeat = daily).actions())
        assertEquals(listOf(TaskAction.RESTORE, TaskAction.DELETE), task(status = TaskStatus.DONE).actions())
        assertEquals(listOf(TaskAction.RESTORE, TaskAction.DELETE_FOREVER), task(status = TaskStatus.DELETED).actions())
    }

    @Test
    fun `each action writes the fields the web writes for it`() {
        val repeating = task(due = Due("2026-10-20T09:00", "UTC"), repeat = daily)
        assertEquals(mapOf("status" to "done"), TaskAction.FINISH_SERIES.changes(repeating, "UTC", now))
        assertEquals(mapOf("status" to "deleted", "deletedAt" to ServerTime), TaskAction.DELETE.changes(task(), "UTC", now))
        assertEquals(mapOf("status" to "active", "deletedAt" to null), TaskAction.RESTORE.changes(task(status = TaskStatus.DELETED), "UTC", now))
        assertEquals(completionChanges(repeating, "UTC", now), TaskAction.DONE.changes(repeating, "UTC", now))
        assertNull(TaskAction.DELETE_FOREVER.changes(task(), "UTC", now))
    }

    @Test
    fun `the record of a task is the one it was read from`() {
        val repeating = task(due = Due("2026-10-20T09:00", "Europe/Kyiv"), repeat = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(1, 5)), pulseMuted = true)
        assertEquals(repeating, taskFromRecord(repeating.toRecord()))
        val deleted = task(status = TaskStatus.DELETED)
        assertEquals(deleted, taskFromRecord(deleted.toRecord()))
    }

    @Test
    fun `a change is written only when the task it leaves passes the check of the core`() {
        val repeating = task(due = Due("2026-10-20T09:00", "UTC"), repeat = daily)
        TaskAction.entries.filter { it != TaskAction.DELETE_FOREVER }.forEach { action ->
            assertEquals(emptyList<String>(), changeErrors(repeating, action.changes(repeating, "UTC", now)!!, now), action.name)
        }
        assertEquals(emptyList<String>(), changeErrors(task(), descriptionChanges("- [x] water"), now))
        assertEquals(listOf("description: invalid"), changeErrors(task(), descriptionChanges("x".repeat(100_001)), now))
        // Deleted, a task needs its time of deletion; done, it may not keep one.
        assertEquals(listOf("deletedAt: invalid"), changeErrors(task(), mapOf("status" to "deleted"), now))
        assertEquals(listOf("deletedAt: invalid"), changeErrors(task(status = TaskStatus.DELETED), mapOf("status" to "active"), now))
    }

    @Test
    fun `a due zone this phone does not know passes the check while a change keeps it`() {
        val far = task(due = Due("2026-10-20T13:00", "Mars/Olympus_Mons"), repeat = daily)
        assertEquals(emptyList<String>(), changeErrors(far, completionChanges(far, "Asia/Tokyo", now), now))
        assertEquals(listOf("due.tz: invalid"), changeErrors(far, mapOf("due" to mapOf("local" to "2026-10-25T13:00", "tz" to "Mars/Valles")), now))
    }
}
