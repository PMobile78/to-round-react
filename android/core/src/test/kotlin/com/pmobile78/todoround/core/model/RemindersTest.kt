package com.pmobile78.todoround.core.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.time.Instant

/** The reminders as the web's src/utils/reminders.js and ReminderEditor.jsx show and add them. */
class RemindersTest {
    @Test
    fun `a reminder shows in its largest whole unit`() {
        assertEquals(ReminderParts(1, ReminderUnit.HOURS), reminderParts(60))
        assertEquals(ReminderParts(25, ReminderUnit.HOURS), reminderParts(1500))
        assertEquals(ReminderParts(2, ReminderUnit.DAYS), reminderParts(2880))
        assertEquals(ReminderParts(1, ReminderUnit.WEEKS), reminderParts(10080))
        assertEquals(ReminderParts(52, ReminderUnit.WEEKS), reminderParts(524_160))
    }

    @Test
    fun `a reminder has passed once its moment is behind now`() {
        // 09:30 in Berlin on 23 October 2026 is 07:30 UTC; an hour before is 06:30 UTC.
        val due = Due("2026-10-23T09:30", "Europe/Berlin")
        assertFalse(reminderPassed(60, due, "UTC", Instant.parse("2026-10-23T06:30:00Z")))
        assertTrue(reminderPassed(60, due, "UTC", Instant.parse("2026-10-23T06:30:00.001Z")))
        assertFalse(reminderPassed(1440, due, "UTC", Instant.parse("2026-10-22T07:00:00Z")))
    }

    @Test
    fun `a number of hours, days or weeks is its minutes`() {
        assertEquals(180, reminderMinutes("3", ReminderUnit.HOURS))
        assertEquals(2880, reminderMinutes("2", ReminderUnit.DAYS))
        assertEquals(524_160, reminderMinutes("52", ReminderUnit.WEEKS))
        assertEquals(60, reminderMinutes("01", ReminderUnit.HOURS))
    }

    @Test
    fun `a number below 1 or beyond 52 weeks is no reminder`() {
        assertNull(reminderMinutes("0", ReminderUnit.DAYS))
        assertNull(reminderMinutes("", ReminderUnit.DAYS))
        assertNull(reminderMinutes("53", ReminderUnit.WEEKS))
        assertNull(reminderMinutes("8737", ReminderUnit.HOURS))
        // Too many weeks for an Int of minutes, too many digits for an Int at all.
        assertNull(reminderMinutes("2147483647", ReminderUnit.WEEKS))
        assertNull(reminderMinutes("99999999999", ReminderUnit.HOURS))
    }

    @Test
    fun `one more reminder keeps the list in order and without repeats`() {
        assertEquals(listOf(60, 1440, 10080), withReminder(listOf(60, 10080), 1440))
        assertEquals(listOf(60, 1440), withReminder(listOf(60, 1440), 1440))
    }

    @Test
    fun `a list of 10 takes no more`() {
        val ten = (1..10).map { it * 60 }
        assertSame(ten, withReminder(ten, 1440))
    }

    @Test
    fun `1 hour and 1 day are the ready-made reminders`() {
        assertEquals(listOf(60, 1440), REMINDER_PRESETS)
    }
}
