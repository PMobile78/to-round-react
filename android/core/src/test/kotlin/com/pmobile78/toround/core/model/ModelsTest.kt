package com.pmobile78.toround.core.model

import com.pmobile78.toround.core.Contract
import com.pmobile78.toround.core.contract.Design
import com.pmobile78.toround.core.contract.Language
import com.pmobile78.toround.core.contract.MainView
import com.pmobile78.toround.core.contract.RepeatUnit
import com.pmobile78.toround.core.contract.SortField
import com.pmobile78.toround.core.contract.SortOrder
import com.pmobile78.toround.core.contract.TaskStatus
import com.pmobile78.toround.core.contract.ThemeMode
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.DynamicTest.dynamicTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestFactory
import org.junit.jupiter.api.assertThrows
import java.time.Instant

class ModelsTest {
    @Suppress("UNCHECKED_CAST")
    private fun valid(path: String, name: String): Map<String, Any?> =
        Contract.cases(path, "valid").first { it.first == name }.second as Map<String, Any?>

    @TestFactory
    fun `every valid task of the contract becomes a task`() = Contract.cases("fixtures/tasks.json", "valid").map { (name, value) ->
        dynamicTest(name) {
            @Suppress("UNCHECKED_CAST")
            val record = value as Map<String, Any?>
            assertEquals(record["id"], taskFromRecord(record).id)
        }
    }

    @Test
    fun `a task keeps every field of its record`() {
        assertEquals(
            Task(
                id = "p0q8r7stu",
                title = "Оплатить счета",
                description = "- [ ] свет\n- [ ] вода",
                categoryId = "k3j9x0abc",
                status = TaskStatus.ACTIVE,
                due = Due(local = "2026-10-15T09:00", tz = "Europe/Kyiv"),
                reminders = listOf(60, 1440),
                repeat = Repeat(every = 1, unit = RepeatUnit.MONTHS, monthDay = 15),
                radius = 45,
                pulseMuted = false,
                createdAt = Instant.parse("2026-10-01T08:00:00Z"),
                updatedAt = Instant.parse("2026-10-10T19:30:00Z"),
                deletedAt = null,
            ),
            taskFromRecord(valid("fixtures/tasks.json", "monthly-with-reminders")),
        )
        val weekly = taskFromRecord(valid("fixtures/tasks.json", "weekly-with-weekdays"))
        assertEquals(Repeat(every = 1, unit = RepeatUnit.WEEKS, weekdays = listOf(1, 3, 5)), weekly.repeat)
        assertEquals(true, weekly.pulseMuted)
        val android = taskFromRecord(valid("fixtures/tasks.json", "timestamps-with-micro-and-nanoseconds"))
        assertEquals(TaskStatus.DELETED, android.status)
        assertEquals(Instant.parse("2026-10-01T08:00:00.123456789Z"), android.updatedAt)
        assertEquals(Instant.parse("2026-10-02T08:00:00.500Z"), android.deletedAt)
    }

    @Test
    fun `a task with a zone this device does not know is read when the caller accepts it`() {
        val record = valid("fixtures/tasks.json", "minimal-without-due") +
            ("due" to mapOf("local" to "2026-10-15T09:00", "tz" to "Mars/Olympus"))
        assertThrows<IllegalArgumentException> { taskFromRecord(record) }
        assertEquals(Due("2026-10-15T09:00", "Mars/Olympus"), taskFromRecord(record, acceptUnknownZone = true).due)
    }

    @Test
    fun `an invalid record is refused with its errors`() {
        val record = valid("fixtures/tasks.json", "minimal-without-due") + ("radius" to 100L)
        val error = assertThrows<IllegalArgumentException> { taskFromRecord(record) }
        assertEquals("task t1: radius: invalid", error.message)
        assertThrows<IllegalArgumentException> { categoryFromRecord(valid("fixtures/categories.json", "basic") - "id") }
        assertThrows<IllegalArgumentException> { settingsFromRecord(valid("fixtures/settings.json", "defaults") - "design") }
    }

    @Test
    fun `a category keeps a fractional order`() {
        assertEquals(Category("k3j9x0abc", "Дом", "#da3833", 1.0), categoryFromRecord(valid("fixtures/categories.json", "basic")))
        assertEquals(1.5, categoryFromRecord(valid("fixtures/categories.json", "fractional-order")).order)
    }

    @Test
    fun `settings keep every field of their record`() {
        assertEquals(
            Settings(
                themeMode = ThemeMode.DARK,
                design = Design.AURORA,
                language = Language.UK,
                mainView = MainView.LIST,
                labelFontSize = 20,
                bubbleBackground = false,
                showCategoriesPanel = true,
                showInstructions = false,
                bubbleFilter = BubbleFilter(categoryIds = listOf("c1", "c2"), showUncategorized = false, plannedOnly = true),
                listFilter = ListFilter(categoryIds = emptyList(), showUncategorized = true),
                listSort = ListSort(by = SortField.CATEGORY, order = SortOrder.ASC),
            ),
            settingsFromRecord(valid("fixtures/settings.json", "customised")),
        )
    }

    @TestFactory
    fun `valid settings come back unchanged from toRecord`() = Contract.cases("fixtures/settings.json", "valid").map { (name, value) ->
        dynamicTest(name) {
            @Suppress("UNCHECKED_CAST")
            val record = value as Map<String, Any?>
            assertEquals(record, settingsFromRecord(record).toRecord())
        }
    }

    @Test
    fun `default settings are the defaults of the contract, in the language of the device`() {
        assertEquals(settingsFromRecord(valid("fixtures/settings.json", "defaults")), defaultSettings("en-US"))
        assertEquals(Language.UK, defaultSettings("uk-UA").language)
        assertEquals(Language.EN, defaultSettings(null).language)
    }

    @Test
    fun `normalizeLanguage takes uk for Ukrainian and en for anything else`() {
        assertEquals(Language.UK, normalizeLanguage("uk"))
        assertEquals(Language.UK, normalizeLanguage("UK-ua"))
        assertEquals(Language.EN, normalizeLanguage("ru-UA"))
        assertEquals(Language.EN, normalizeLanguage("en"))
        assertEquals(Language.EN, normalizeLanguage(""))
        assertEquals(Language.EN, normalizeLanguage(null))
    }
}
