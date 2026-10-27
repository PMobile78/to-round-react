package com.pmobile78.todoround.notifications

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class RemindersTest {
    // A reminder as functions/lib/messages.js sends it.
    private val reminder = mapOf(
        "type" to "reminder",
        "taskId" to "t1",
        "title" to "Task reminder",
        "body" to "1 hour before: Buy milk",
        "url" to "https://pmobile78.github.io/to-round-react/?taskId=t1",
        "minutesBefore" to "60",
    )

    @Test
    fun `a reminder and an overdue task are shown in the texts of the server`() {
        assertEquals(Reminder("t1", "reminder", "Task reminder", "1 hour before: Buy milk"), reminderOf(reminder))
        val overdue = mapOf(
            "type" to "overdue",
            "taskId" to "t1",
            "title" to "Прострочене завдання!",
            "body" to "Прострочено: Buy milk",
            "url" to "https://pmobile78.github.io/to-round-react/?taskId=t1",
        )
        assertEquals(Reminder("t1", "overdue", "Прострочене завдання!", "Прострочено: Buy milk"), reminderOf(overdue))
    }

    @Test
    fun `a push of another kind or without a task is not shown`() {
        assertNull(reminderOf(reminder + ("type" to "digest")))
        assertNull(reminderOf(reminder - "type"))
        assertNull(reminderOf(reminder - "taskId"))
        assertNull(reminderOf(reminder + ("taskId" to "")))
    }

    @Test
    fun `a push without its texts is not shown`() {
        assertNull(reminderOf(reminder - "title"))
        assertNull(reminderOf(reminder - "body"))
        assertNull(reminderOf(reminder + ("body" to "")))
    }
}
