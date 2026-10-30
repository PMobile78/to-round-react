package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.TaskStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.time.Instant
import java.time.LocalDate
import java.util.TimeZone

/** The form of a task as the web's src/services/data/taskForm.js reads its dialogs (taskForm.test.js). */
class TaskFormTest {
    private val berlin = "Europe/Berlin"

    private fun task(
        title: String = "Pay bills",
        categoryId: String? = "c1",
        due: Due? = Due("2026-10-15T09:00", "Europe/Kyiv"),
        reminders: List<Int> = listOf(60),
        repeat: Repeat? = null,
        pulseMuted: Boolean = false,
    ) = Task(
        id = "t1",
        title = title,
        description = "- [ ] power",
        categoryId = categoryId,
        status = TaskStatus.ACTIVE,
        due = due,
        reminders = reminders,
        repeat = repeat,
        radius = 45,
        pulseMuted = pulseMuted,
        createdAt = Instant.parse("2026-10-01T08:00:00Z"),
        updatedAt = Instant.parse("2026-10-01T08:00:00Z"),
        deletedAt = null,
    )

    // A form of a new task with a due on a phone in Berlin.
    private fun form(
        title: String = "Pay bills",
        description: String = "",
        categoryId: String? = null,
        due: String? = "2026-10-15T09:30",
        reminders: List<Int> = emptyList(),
        repeat: Repeat? = null,
    ) = TaskForm(title, description, categoryId, due, reminders, repeat, radius = 45)

    // The changes of the edit form of [task] on a phone in Berlin, the user having changed [edit].
    private fun changes(task: Task, edit: (TaskForm) -> TaskForm): Map<String, Any?> {
        val opened = task.toForm(berlin)
        return formChanges(task, opened, edit(opened), berlin)
    }

    @Test
    fun `the form of a task shows its due on this phone, the rest as it is`() {
        // 09:00 in Kyiv is 08:00 in Berlin.
        assertEquals(TaskForm("Pay bills", "- [ ] power", "c1", "2026-10-15T08:00", listOf(60), null, 45), task().toForm(berlin))
        assertNull(task(due = null, reminders = emptyList()).toForm(berlin).due)
        // A zone this phone does not know: the time as written, in the zone of the phone (2.2 №4).
        assertEquals("2026-10-15T09:00", task(due = Due("2026-10-15T09:00", "Mars/Olympus")).toForm(berlin).due)
    }

    @Test
    fun `a new task has no category, no due and the size 45`() {
        assertEquals(TaskForm("", "", null, null, emptyList(), null, 45), NEW_TASK_FORM)
    }

    @Test
    fun `a new task writes its due in the zone of this phone`() {
        assertEquals(
            mapOf(
                "title" to "Pay bills", "description" to "", "categoryId" to null, "due" to mapOf("local" to "2026-10-15T09:30", "tz" to berlin),
                "reminders" to emptyList<Long>(), "repeat" to null, "radius" to 45L,
            ),
            newTaskFields(form(), berlin),
        )
    }

    @Test
    fun `a zone the base does not know writes the due in UTC at the same moment`() {
        // Android gives a zone set by hand as GMT+03:00, which neither the web nor the functions know (2.2 №5).
        assertEquals("UTC", writeZone("GMT+03:00"))
        assertEquals(berlin, writeZone(berlin))
        assertEquals(mapOf("local" to "2026-10-15T06:30", "tz" to "UTC"), newTaskFields(form(), "GMT+03:00")["due"])
        val muted = task(due = Due("2026-10-15T09:00", berlin), pulseMuted = true)
        val opened = muted.toForm("GMT+03:00")
        assertEquals(
            mapOf("due" to mapOf("local" to "2026-10-16T07:00", "tz" to "UTC"), "pulseMuted" to false),
            formChanges(muted, opened, opened.copy(due = "2026-10-16T10:00"), "GMT+03:00"),
        )
    }

    @Test
    fun `a time that a spring night skips is written as the moment it means`() {
        // 02:30 on 29 March 2026 does not exist in Berlin: it is 03:30, as the web's picker gives it.
        assertEquals(mapOf("local" to "2026-03-29T03:30", "tz" to berlin), newTaskFields(form(due = "2026-03-29T02:30"), berlin)["due"])
    }

    @Test
    fun `the title loses the spaces around it, as JavaScript trims, and the description stays as typed`() {
        val fields = newTaskFields(form(title = "\uFEFF\u00A0 Pay bills \n", description = "**bold**\n"), berlin)
        assertEquals("Pay bills", fields["title"])
        assertEquals("**bold**\n", fields["description"])
        // U+0085 is not a space of JavaScript's trim.
        assertEquals("\u0085Pay", newTaskFields(form(title = "\u0085Pay "), berlin)["title"])
    }

    @Test
    fun `the category is the one picked, none is null`() {
        assertEquals("c1", newTaskFields(form(categoryId = "c1"), berlin)["categoryId"])
        assertNull(newTaskFields(form(categoryId = null), berlin)["categoryId"])
    }

    @Test
    fun `reminders are whole hours from 1 hour to 52 weeks, without repeats, ascending, at most 10`() {
        assertEquals(listOf(60L, 120L, 1440L), newTaskFields(form(reminders = listOf(1440, 60, 60, 90, 0, 524_220, 120)), berlin)["reminders"])
        val eleven = (1..11).map { it * 60 }
        assertEquals(eleven.take(10).map(Int::toLong), newTaskFields(form(reminders = eleven), berlin)["reminders"])
    }

    @Test
    fun `a repeat is every 1 to 999 units`() {
        assertEquals(mapOf("every" to 999L, "unit" to "days"), newTaskFields(form(repeat = Repeat(1500, RepeatUnit.DAYS)), berlin)["repeat"])
        assertEquals(mapOf("every" to 1L, "unit" to "hours"), newTaskFields(form(repeat = Repeat(0, RepeatUnit.HOURS)), berlin)["repeat"])
    }

    @Test
    fun `weekdays stay only with weeks, sorted and only when some are chosen`() {
        assertEquals(
            mapOf("every" to 2L, "unit" to "weeks", "weekdays" to listOf(1L, 7L)),
            newTaskFields(form(repeat = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(7, 1, 1, 9))), berlin)["repeat"],
        )
        assertEquals(mapOf("every" to 1L, "unit" to "weeks"), newTaskFields(form(repeat = Repeat(1, RepeatUnit.WEEKS, weekdays = emptyList())), berlin)["repeat"])
        assertEquals(mapOf("every" to 1L, "unit" to "days"), newTaskFields(form(repeat = Repeat(1, RepeatUnit.DAYS, weekdays = listOf(1))), berlin)["repeat"])
    }

    @Test
    fun `a monthly repeat takes its day from the due`() {
        assertEquals(
            mapOf("every" to 1L, "unit" to "months", "monthDay" to 15L),
            newTaskFields(form(repeat = Repeat(1, RepeatUnit.MONTHS, monthDay = 3)), berlin)["repeat"],
        )
    }

    @Test
    fun `without a due there are no reminders and no repeat`() {
        val fields = newTaskFields(form(due = null, reminders = listOf(60), repeat = Repeat(1, RepeatUnit.DAYS)), berlin)
        assertNull(fields["due"])
        assertEquals(emptyList<Long>(), fields["reminders"])
        assertNull(fields["repeat"])
    }

    @Test
    fun `the record of a new task passes the check of the core, and a broken one does not`() {
        val now = Instant.parse("2026-10-14T10:00:00Z")
        val full = form(categoryId = "c1", reminders = listOf(60, 1440), repeat = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(1, 5)))
        assertEquals(emptyList<String>(), newTaskErrors("t1", newTaskFields(full, berlin), now))
        assertEquals(listOf("title: invalid"), newTaskErrors("t1", newTaskFields(form(title = " "), berlin), now))
        assertEquals(listOf("description: invalid"), newTaskErrors("t1", newTaskFields(form(description = "x".repeat(100_001)), berlin), now))
    }

    @Test
    fun `an unchanged form changes nothing`() {
        val weekly = task(repeat = Repeat(1, RepeatUnit.WEEKS, weekdays = listOf(1, 7)), reminders = listOf(60, 1440))
        assertEquals(emptyMap<String, Any?>(), changes(weekly) { it })
    }

    @Test
    fun `only the fields the user changed are written`() {
        assertEquals(mapOf("title" to "Pay all bills", "categoryId" to null), changes(task()) { it.copy(title = "Pay all bills", categoryId = null) })
    }

    @Test
    fun `the due and its zone stay while the form shows the time it opened with`() {
        assertEquals(mapOf("radius" to 60L), changes(task()) { it.copy(radius = 60) })
        // A due in a zone this phone does not know stays as written too.
        assertEquals(mapOf("title" to "Pay all bills"), changes(task(due = Due("2026-10-15T09:00", "Mars/Olympus"))) { it.copy(title = "Pay all bills") })
    }

    @Test
    fun `a changed due is written in the zone of this phone and lets a muted task pulse again`() {
        assertEquals(
            mapOf("due" to mapOf("local" to "2026-10-16T09:00", "tz" to berlin), "pulseMuted" to false),
            changes(task(pulseMuted = true)) { it.copy(due = "2026-10-16T09:00") },
        )
    }

    @Test
    fun `clearing the due clears the reminders and the repeat with it`() {
        assertEquals(
            mapOf("due" to null, "reminders" to emptyList<Long>(), "repeat" to null),
            changes(task(repeat = Repeat(1, RepeatUnit.DAYS))) { it.withoutDue() },
        )
        // Even when the form still holds them, as the web's form would.
        assertEquals(
            mapOf("due" to null, "reminders" to emptyList<Long>(), "repeat" to null),
            changes(task(repeat = Repeat(1, RepeatUnit.DAYS))) { it.copy(due = null) },
        )
    }

    @Test
    fun `a monthly task that Done moved into a shorter month keeps its day while the due stays`() {
        val february = task(due = Due("2026-02-28T09:00", berlin), repeat = Repeat(1, RepeatUnit.MONTHS, monthDay = 31))
        assertEquals(mapOf("title" to "Rent"), changes(february) { it.copy(title = "Rent") })
        assertEquals(
            mapOf("repeat" to mapOf("every" to 2L, "unit" to "months", "monthDay" to 31L)),
            changes(february) { it.copy(repeat = Repeat(2, RepeatUnit.MONTHS)) },
        )
    }

    @Test
    fun `a new due gives a monthly repeat its day`() {
        val february = task(due = Due("2026-02-28T09:00", berlin), repeat = Repeat(1, RepeatUnit.MONTHS, monthDay = 31))
        assertEquals(
            mapOf("due" to mapOf("local" to "2026-03-15T09:00", "tz" to berlin), "repeat" to mapOf("every" to 1L, "unit" to "months", "monthDay" to 15L)),
            changes(february) { it.copy(due = "2026-03-15T09:00") },
        )
    }

    @Test
    fun `a repeat that becomes monthly takes the day of the due`() {
        val daily = task(due = Due("2026-01-31T09:00", berlin), repeat = Repeat(1, RepeatUnit.DAYS))
        assertEquals(
            mapOf("repeat" to mapOf("every" to 1L, "unit" to "months", "monthDay" to 31L)),
            changes(daily) { it.copy(repeat = Repeat(1, RepeatUnit.MONTHS)) },
        )
    }

    @Test
    fun `the form can be saved with a title and a description of at most 100 000 characters`() {
        assertTrue(form().canSave())
        assertFalse(form(title = " \u00A0\uFEFF\n").canSave())
        assertTrue(form(description = "x".repeat(100_000)).canSave())
        assertFalse(form(description = "x".repeat(100_001)).canSave())
    }

    @Test
    fun `clearing the due of the form takes its reminders and repeat`() {
        val full = form(reminders = listOf(60), repeat = Repeat(1, RepeatUnit.DAYS))
        assertEquals(full.copy(due = null, reminders = emptyList(), repeat = null), full.withoutDue())
    }

    @Test
    fun `Every takes a whole number from 1 to 999 and nothing else`() {
        assertEquals(1, repeatEvery("1"))
        assertEquals(999, repeatEvery("999"))
        assertEquals(12, repeatEvery("012"))
        assertNull(repeatEvery("0"))
        assertNull(repeatEvery("1000"))
        assertNull(repeatEvery(""))
        assertNull(repeatEvery("99999999999"))
        assertEquals(Repeat(1, RepeatUnit.DAYS), NEW_REPEAT)
    }

    @Test
    fun `a weekday is chosen in order and unchosen`() {
        val weekly = Repeat(1, RepeatUnit.WEEKS)
        assertEquals(listOf(5), weekly.toggledWeekday(5).weekdays)
        assertEquals(listOf(1, 5), weekly.toggledWeekday(5).toggledWeekday(1).weekdays)
        assertEquals(listOf(1), weekly.toggledWeekday(5).toggledWeekday(1).toggledWeekday(5).weekdays)
    }

    @Test
    fun `the day of a date picker is its day in UTC, west of Greenwich too`() {
        val zone = TimeZone.getDefault()
        TimeZone.setDefault(TimeZone.getTimeZone("America/Los_Angeles"))
        try {
            // Midnight UTC of 23 October is 17:00 of the 22nd in Los Angeles.
            assertEquals(LocalDate.of(2026, 10, 23), pickedDate(Instant.parse("2026-10-23T00:00:00Z").toEpochMilli()))
            assertEquals(Instant.parse("2026-10-23T00:00:00Z").toEpochMilli(), pickerMillis(LocalDate.of(2026, 10, 23)))
            assertEquals("2026-10-23T09:05", pickedDue(pickedDate(pickerMillis(LocalDate.of(2026, 10, 23))), 9, 5))
        } finally {
            TimeZone.setDefault(zone)
        }
    }

    @Test
    fun `the due shows as the web's date picker writes it`() {
        assertEquals("10/23/2026 09:30", formDateTime("2026-10-23T09:30", Language.EN))
        assertEquals("23.10.2026 09:30", formDateTime("2026-10-23T09:30", Language.UK))
    }
}
