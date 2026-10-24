package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.TaskStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.time.Instant

/** The task list of the web (src/components/TaskList.jsx), on its own examples. */
class TaskListTest {
    private val home = Category("c1", "home", "#46a549", 1.0)
    private val work = Category("c2", "Work", "#da3833", 2.0)
    private val categories = listOf(home, work)
    private val byTitle = ListSort(SortField.TITLE, SortOrder.ASC)
    private val now = Instant.parse("2026-10-24T12:00:00Z")

    private fun task(
        id: String,
        title: String = "Task $id",
        categoryId: String? = null,
        status: TaskStatus = TaskStatus.ACTIVE,
        due: Due? = null,
        description: String = "",
        createdAt: String = "2026-10-01T08:00:00Z",
        updatedAt: String = createdAt,
    ) = Task(
        id = id,
        title = title,
        description = description,
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

    private fun ids(
        tasks: List<Task>,
        tab: ListTab = ListTab.ACTIVE,
        filter: ListFilter = SHOW_ALL,
        sort: ListSort = byTitle,
        query: String = "",
    ): List<String> = tabTasks(tasks, categories, ListOptions(tab, filter, sort, query), "UTC", now).map { it.id }

    @Test
    fun `each tab holds the tasks of its status, the planned one the active tasks whose due is still ahead`() {
        val tasks = listOf(
            task("a"),
            task("b", status = TaskStatus.DONE),
            task("c", status = TaskStatus.DELETED),
            task("d", due = Due("2026-10-24T12:01", "UTC")),
            task("e", due = Due("2026-10-24T12:00", "UTC")),
            task("f", status = TaskStatus.DONE, due = Due("2099-01-01T09:00", "UTC")),
        )
        assertEquals(listOf("a", "d", "e"), ids(tasks))
        assertEquals(listOf("b", "f"), ids(tasks, ListTab.DONE))
        assertEquals(listOf("c"), ids(tasks, ListTab.DELETED))
        // A due at this very moment is no longer ahead.
        assertEquals(listOf("d"), ids(tasks, ListTab.PLANNED))
    }

    @Test
    fun `a planned due in a zone the phone does not know is read in the zone of the phone`() {
        // 12:30 in an unknown zone reads as 12:30 in Berlin, 10:30 UTC: already passed at 12:00 UTC.
        val tasks = listOf(task("a", due = Due("2026-10-24T12:30", "Mars/Olympus_Mons")))
        assertEquals(emptyList<String>(), tabTasks(tasks, categories, ListOptions(ListTab.PLANNED, SHOW_ALL, byTitle, ""), "Europe/Berlin", now))
        assertEquals(tasks, tabTasks(tasks, categories, ListOptions(ListTab.PLANNED, SHOW_ALL, byTitle, ""), "UTC", now))
    }

    @Test
    fun `the filter shows the chosen categories and, when asked, the tasks without one`() {
        val tasks = listOf(task("a", categoryId = "c1"), task("b", categoryId = "c2"), task("c"), task("d", categoryId = "gone"))
        assertEquals(listOf("a", "b", "c", "d"), ids(tasks))
        assertEquals(listOf("a", "b"), ids(tasks, filter = ListFilter(categoryIds = null, showUncategorized = false)))
        assertEquals(listOf("a"), ids(tasks, filter = ListFilter(listOf("c1"), showUncategorized = false)))
        assertEquals(listOf("a", "c", "d"), ids(tasks, filter = ListFilter(listOf("c1"), showUncategorized = true)))
        // A task whose category is gone counts as one without a category, even when the filter names it.
        assertEquals(emptyList<String>(), ids(tasks, filter = ListFilter(listOf("gone"), showUncategorized = false)))
        assertEquals(emptyList<String>(), ids(tasks, filter = SHOW_NONE))
    }

    @Test
    fun `the search looks without case in the title, the description and the name of an existing category`() {
        val tasks = listOf(
            task("a", "Buy MILK"),
            task("b", description = "- [ ] milk\n- [x] bread"),
            task("c", categoryId = "c1"),
            task("d", categoryId = "gone", description = "home made"),
            task("e", "Яблука"),
        )
        assertEquals(listOf("a", "b"), ids(tasks, query = "  Milk "))
        assertEquals(listOf("c", "d"), ids(tasks, query = "HOME"))
        assertEquals(listOf("e"), ids(tasks, query = "яблук"))
        // The description is searched as written, its Markdown included.
        assertEquals(listOf("b"), ids(tasks, query = "[x] bread"))
        assertEquals(listOf("a", "b", "c", "d", "e"), ids(tasks, query = "   "))
        assertEquals(emptyList<String>(), ids(tasks, query = "work"))
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
    fun `the number of a tab counts its tasks that the filter and the search let through`() {
        val tasks = listOf(
            task("a", "milk", categoryId = "c1"),
            task("b", "milk", categoryId = "c2"),
            task("c", "bread"),
            task("d", "milk", status = TaskStatus.DONE),
            task("e", "milk", status = TaskStatus.DELETED, categoryId = "c1"),
            task("f", "milk", due = Due("2099-01-01T09:00", "UTC")),
        )
        val all = mapOf(ListTab.ACTIVE to 4, ListTab.DONE to 1, ListTab.DELETED to 1, ListTab.PLANNED to 1)
        assertEquals(all, tabCounts(tasks, categories, SHOW_ALL, "", "UTC", now))
        val milkAtHomeOrWithout = mapOf(ListTab.ACTIVE to 2, ListTab.DONE to 1, ListTab.DELETED to 1, ListTab.PLANNED to 1)
        assertEquals(milkAtHomeOrWithout, tabCounts(tasks, categories, ListFilter(listOf("c1"), true), "MILK", "UTC", now))
    }

    @Test
    fun `the filter panel counts the tasks of the tab and the search by category, a gone one among those without`() {
        val tasks = listOf(
            task("a", "milk", categoryId = "c1"),
            task("b", "bread", categoryId = "c1"),
            task("c", "milk"),
            task("d", "milk", categoryId = "gone"),
            task("e", "milk", categoryId = "c2", status = TaskStatus.DONE),
        )
        assertEquals(mapOf("c1" to 2, null to 2), filterCounts(tasks, categories, ListTab.ACTIVE, "", "UTC", now))
        assertEquals(mapOf("c1" to 1, null to 2), filterCounts(tasks, categories, ListTab.ACTIVE, "milk", "UTC", now))
        assertEquals(mapOf("c2" to 1), filterCounts(tasks, categories, ListTab.DONE, "milk", "UTC", now))
    }

    @Test
    fun `the panel shows every category chosen for null and drops a gone one from a list`() {
        assertEquals(listOf("c1", "c2"), SHOW_ALL.chosen(categories))
        assertEquals(listOf("c2", "c1"), ListFilter(listOf("c2", "gone", "c1"), true).chosen(categories))
        assertEquals(emptyList<String>(), SHOW_NONE.chosen(categories))
    }

    @Test
    fun `a category is chosen and unchosen, and every category chosen is null again`() {
        val withoutWork = SHOW_ALL.toggled("c2", categories)
        assertEquals(ListFilter(listOf("c1"), true), withoutWork)
        assertEquals(SHOW_ALL, withoutWork.toggled("c2", categories))
        // A gone category drops out of the list when another one is toggled.
        assertEquals(ListFilter(listOf("c1"), false), ListFilter(listOf("gone"), false).toggled("c1", categories))
        assertEquals(ListFilter(null, false), ListFilter(listOf("gone", "c1"), false).toggled("c2", categories))
        assertEquals(ListFilter(listOf("c1"), true), ListFilter(listOf("c1"), false).toggledUncategorized())
    }

    @Test
    fun `the filter hides some tasks when a category or the tasks without one are not chosen`() {
        assertFalse(SHOW_ALL.hidesSome(categories))
        assertFalse(ListFilter(listOf("c2", "c1", "gone"), true).hidesSome(categories))
        assertTrue(ListFilter(listOf("c1"), true).hidesSome(categories))
        assertTrue(ListFilter(null, false).hidesSome(categories))
        assertFalse(ListFilter(emptyList(), true).hidesSome(emptyList()))
    }

    @Test
    fun `categories go by their order, a tie by id`() {
        val a = Category("b", "B", "#46a549", 2.0)
        val b = Category("a", "A", "#da3833", 2.0)
        val c = Category("c", "C", "#fd8b2b", 1.5)
        assertEquals(listOf(c, b, a), inOrder(listOf(a, b, c)))
    }

    @Test
    fun `a due shows in the zone of the phone and is overdue once its moment has passed`() {
        // 09:30 in New York on 23 October 2026 (EDT, UTC−4) is 13:30 UTC.
        val due = Due("2026-10-23T09:30", "America/New_York")
        assertEquals(DueView("2026-10-23T13:30", overdue = false), dueView(due, "UTC", Instant.parse("2026-10-23T13:30:00Z")))
        assertEquals(DueView("2026-10-23T15:30", overdue = true), dueView(due, "Europe/Berlin", Instant.parse("2026-10-23T13:30:00.001Z")))
    }

    @Test
    fun `a due zone this phone does not know is read in the zone of the phone, as the web reads it`() {
        // 09:30 in Berlin on 23 October 2026 (CEST, UTC+2) is 07:30 UTC.
        val due = Due("2026-10-23T09:30", "Mars/Olympus_Mons")
        assertEquals(DueView("2026-10-23T09:30", overdue = false), dueView(due, "Europe/Berlin", Instant.parse("2026-10-23T07:30:00Z")))
        assertEquals(DueView("2026-10-23T09:30", overdue = true), dueView(due, "Europe/Berlin", Instant.parse("2026-10-23T07:30:00.001Z")))
        // An offset is not a zone of the base either.
        assertEquals(Instant.parse("2026-10-23T09:30:00Z"), dueMoment(Due("2026-10-23T09:30", "+05:00"), "UTC"))
    }

    @Test
    fun `dates are written as the web's list writes them`() {
        assertEquals("10/23/2026, 09:30", listDateTime("2026-10-23T09:30", Language.EN))
        assertEquals("23.10.2026, 09:30", listDateTime("2026-10-23T09:30", Language.UK))
        assertEquals("01/02/2026, 00:05", listDateTime("2026-01-02T00:05", Language.EN))
        assertEquals("23.10.2026, 11:30", listDateTime(Instant.parse("2026-10-23T09:30:59Z"), "Europe/Berlin", Language.UK))
    }

    @Test
    fun `a task counts as changed when its times differ by a millisecond or more`() {
        assertFalse(task("a", updatedAt = "2026-10-01T08:00:00.000999Z").changedAfterCreation())
        assertTrue(task("a", updatedAt = "2026-10-01T08:00:00.001Z").changedAfterCreation())
    }
}
