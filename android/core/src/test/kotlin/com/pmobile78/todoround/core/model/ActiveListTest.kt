package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.TaskStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.Instant

/** The "Active" tab of the web's task list (src/components/TaskList.jsx), on its own examples. */
class ActiveListTest {
    private val home = Category("c1", "home", "#46a549", 1.0)
    private val work = Category("c2", "Work", "#da3833", 2.0)
    private val everything = ListFilter(categoryIds = null, showUncategorized = true)
    private val byTitle = ListSort(SortField.TITLE, SortOrder.ASC)

    private fun task(
        id: String,
        title: String = "Task $id",
        categoryId: String? = null,
        status: TaskStatus = TaskStatus.ACTIVE,
        due: Due? = null,
        createdAt: String = "2026-10-01T08:00:00Z",
        updatedAt: String = createdAt,
    ) = Task(
        id = id,
        title = title,
        description = "",
        categoryId = categoryId,
        status = status,
        due = due,
        reminders = emptyList(),
        repeat = null,
        radius = 45,
        pulseMuted = false,
        createdAt = Instant.parse(createdAt),
        updatedAt = Instant.parse(updatedAt),
        deletedAt = if (status == TaskStatus.DELETED) Instant.parse(updatedAt) else null,
    )

    private fun ids(tasks: List<Task>, filter: ListFilter = everything, sort: ListSort = byTitle): List<String> =
        activeList(tasks, listOf(home, work), filter, sort).tasks.map { it.id }

    @Test
    fun `only active tasks are listed, the planned ones too`() {
        val tasks = listOf(
            task("a"),
            task("b", status = TaskStatus.DONE),
            task("c", status = TaskStatus.DELETED),
            task("d", due = Due("2099-01-01T09:00", "UTC")),
        )
        assertEquals(ActiveList(listOf(tasks[0], tasks[3]), all = 2), activeList(tasks, listOf(home, work), everything, byTitle))
    }

    @Test
    fun `the filter shows the chosen categories and, when asked, the tasks without one`() {
        val tasks = listOf(task("a", categoryId = "c1"), task("b", categoryId = "c2"), task("c"), task("d", categoryId = "gone"))
        assertEquals(listOf("a", "b", "c", "d"), ids(tasks))
        assertEquals(listOf("a", "b"), ids(tasks, ListFilter(categoryIds = null, showUncategorized = false)))
        assertEquals(listOf("a"), ids(tasks, ListFilter(listOf("c1"), showUncategorized = false)))
        assertEquals(listOf("a", "c", "d"), ids(tasks, ListFilter(listOf("c1"), showUncategorized = true)))
        // A task whose category is gone counts as one without a category, even when the filter names it.
        assertEquals(emptyList<String>(), ids(tasks, ListFilter(listOf("gone"), showUncategorized = false)))
        assertEquals(emptyList<String>(), ids(tasks, ListFilter(emptyList(), showUncategorized = false)))
        assertEquals(4, activeList(tasks, listOf(home, work), ListFilter(emptyList(), showUncategorized = false), byTitle).all)
    }

    @Test
    fun `titles are compared without case`() {
        val tasks = listOf(task("1", "banana"), task("2", "Cherry"), task("3", "apple"), task("4", "Яблуко"), task("5", "вишня"))
        assertEquals(listOf("3", "1", "2", "5", "4"), ids(tasks))
        assertEquals(listOf("4", "5", "2", "1", "3"), ids(tasks, sort = ListSort(SortField.TITLE, SortOrder.DESC)))
    }

    @Test
    fun `categories are compared by name without case, a task without one first`() {
        val tasks = listOf(task("w", categoryId = "c2"), task("h", categoryId = "c1"), task("n"), task("g", categoryId = "gone"))
        assertEquals(listOf("g", "n", "h", "w"), ids(tasks, sort = ListSort(SortField.CATEGORY, SortOrder.ASC)))
        assertEquals(listOf("w", "h", "g", "n"), ids(tasks, sort = ListSort(SortField.CATEGORY, SortOrder.DESC)))
    }

    @Test
    fun `times are compared to the millisecond, as the web's Date`() {
        val tasks = listOf(
            task("b", updatedAt = "2026-10-01T08:00:00.123999Z"),
            task("a", updatedAt = "2026-10-01T08:00:00.123001Z"),
            task("c", updatedAt = "2026-10-01T08:00:00.124Z"),
            task("d", createdAt = "2026-09-01T08:00:00Z", updatedAt = "2026-10-02T08:00:00Z"),
        )
        // a and b fall on the same millisecond: a tie, which the ids decide.
        assertEquals(listOf("d", "c", "a", "b"), ids(tasks, sort = ListSort(SortField.UPDATED_AT, SortOrder.DESC)))
        assertEquals(listOf("d", "a", "b", "c"), ids(tasks, sort = ListSort(SortField.CREATED_AT, SortOrder.ASC)))
    }

    @Test
    fun `a tie keeps the order of the document ids in both directions`() {
        val tasks = listOf(task("b", "Same"), task("c", "same"), task("a", "SAME"))
        assertEquals(listOf("a", "b", "c"), ids(tasks, sort = ListSort(SortField.TITLE, SortOrder.ASC)))
        assertEquals(listOf("a", "b", "c"), ids(tasks, sort = ListSort(SortField.TITLE, SortOrder.DESC)))
    }

    @Test
    fun `a due shows in the zone of the phone and is overdue once its moment has passed`() {
        // 09:30 in New York on 23 October 2026 (EDT, UTC−4) is 13:30 UTC.
        val due = Due("2026-10-23T09:30", "America/New_York")
        assertEquals(DueView("2026-10-23T13:30", overdue = false), dueView(due, "UTC", Instant.parse("2026-10-23T13:30:00Z")))
        assertEquals(DueView("2026-10-23T15:30", overdue = true), dueView(due, "Europe/Berlin", Instant.parse("2026-10-23T13:30:00.001Z")))
    }

    @Test
    fun `a due zone this phone does not know is shown as written and never overdue`() {
        val due = Due("2026-10-23T09:30", "Mars/Olympus_Mons")
        assertEquals(DueView("2026-10-23T09:30", overdue = false), dueView(due, "UTC", Instant.parse("2030-01-01T00:00:00Z")))
    }

    @Test
    fun `dates are written as the web's list writes them`() {
        assertEquals("10/23/2026, 09:30", listDateTime("2026-10-23T09:30", Language.EN))
        assertEquals("23.10.2026, 09:30", listDateTime("2026-10-23T09:30", Language.UK))
        assertEquals("01/02/2026, 00:05", listDateTime("2026-01-02T00:05", Language.EN))
    }
}
