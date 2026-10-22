package com.pmobile78.todoround.core.contract

import com.pmobile78.todoround.core.Contract
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class SchemaTest {
    @Test
    fun `the palette is the one of contract palette json`() {
        assertEquals(Contract.read("palette.json"), PALETTE)
    }

    @Test
    fun `the enumerations hold the values of spec section 3`() {
        assertEquals(listOf("active", "done", "deleted"), TaskStatus.entries.map { it.wire })
        assertEquals(listOf("hours", "days", "weeks", "months"), RepeatUnit.entries.map { it.wire })
        assertEquals(listOf("light", "dark", "system"), ThemeMode.entries.map { it.wire })
        assertEquals(listOf("classic", "modern", "aurora", "brutalist", "clay"), Design.entries.map { it.wire })
        assertEquals(listOf("en", "uk"), Language.entries.map { it.wire })
        assertEquals(listOf("bubbles", "list"), MainView.entries.map { it.wire })
        assertEquals(listOf("createdAt", "updatedAt", "title", "category"), SortField.entries.map { it.wire })
        assertEquals(listOf("asc", "desc"), SortOrder.entries.map { it.wire })
    }

    @Test
    fun `fromWire reads a stored value and nothing else`() {
        assertEquals(TaskStatus.DELETED, fromWire<TaskStatus>("deleted"))
        assertEquals(SortField.CATEGORY, fromWire<SortField>("category"))
        assertNull(fromWire<TaskStatus>("postpone"))
        assertNull(fromWire<SortField>("tag"))
        assertNull(fromWire<TaskStatus>("ACTIVE"))
        assertNull(fromWire<TaskStatus>(null))
        assertNull(fromWire<TaskStatus>(1L))
    }
}
