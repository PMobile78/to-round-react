package com.pmobile78.todoround.ui

import androidx.compose.runtime.saveable.SaverScope
import androidx.compose.ui.text.TextRange
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.Repeat
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.toForm
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import java.time.Instant

/** The form as the saved state of its screen keeps it over a turn of the phone and an unloading of the app (2.2 №14). */
class EditSaverTest {
    private val task = Task(
        id = "t1",
        title = "Rent",
        description = "- [ ] pay",
        categoryId = "c1",
        status = TaskStatus.DONE,
        due = Due("2026-11-30T09:00", "Mars/Olympus"),
        reminders = listOf(60, 2880),
        repeat = Repeat(1, RepeatUnit.MONTHS, monthDay = 31),
        radius = 60,
        pulseMuted = true,
        createdAt = Instant.parse("2026-10-01T08:00:00.123456Z"),
        updatedAt = Instant.parse("2026-10-02T08:00:00Z"),
        deletedAt = null,
    )

    private fun saved(edit: Edit?): Any? = with(EditSaver) { SaverScope { true }.save(edit) }

    private fun again(edit: Edit?): Edit? = saved(edit)?.let { EditSaver.restore(it) }

    @Test
    fun `the form of a task comes back whole`() {
        val opened = task.toForm("Europe/Kyiv")
        val edit = Edit(
            task,
            opened,
            opened.copy(title = "Pay rent", description = "**soon**", reminders = listOf(60), repeat = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(1, 5))),
            TextRange(2, 6),
        )
        assertEquals(edit, again(edit))
    }

    @Test
    fun `the form of a new task comes back whole, and no form is none`() {
        val new = Edit.of(null, "UTC")
        val edit = new.copy(form = new.form.copy(title = "Call mum", due = "2026-11-02T09:30", repeat = Repeat(1, RepeatUnit.DAYS)))
        assertEquals(edit, again(edit))
        assertNull(saved(null))
    }

    @Test
    fun `a description the one before it has is kept once`() {
        val opened = task.toForm("UTC")
        val values = saved(Edit(task, opened, opened)) as List<*>
        assertEquals(listOf(null, null), listOf((values[1] as List<*>)[1], (values[2] as List<*>)[1]))
    }
}
