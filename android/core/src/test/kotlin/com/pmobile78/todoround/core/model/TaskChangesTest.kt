package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.TaskStatus
import org.junit.jupiter.api.Assertions.assertEquals
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
        deletedAt = null,
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
}
