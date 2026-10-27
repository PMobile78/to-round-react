package com.pmobile78.todoround.core.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.time.Instant

/** The reminders as the web's src/utils/reminders.js and ReminderEditor.jsx show them. */
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
}
