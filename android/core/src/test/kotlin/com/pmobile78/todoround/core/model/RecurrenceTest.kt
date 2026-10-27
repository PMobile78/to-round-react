package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.Contract
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.fromWire
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.DynamicTest.dynamicTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestFactory
import org.junit.jupiter.api.assertThrows
import java.time.Instant

class RecurrenceTest {
    @Suppress("UNCHECKED_CAST")
    private fun repeatOf(record: Map<String, Any?>) = Repeat(
        every = (record["every"] as Long).toInt(),
        unit = fromWire<RepeatUnit>(record["unit"])!!,
        weekdays = (record["weekdays"] as List<Long>?)?.map { it.toInt() },
        monthDay = (record["monthDay"] as Long?)?.toInt(),
    )

    @Suppress("UNCHECKED_CAST")
    @TestFactory
    fun `nextFutureOccurrence on the contract examples`() = (Contract.read("fixtures/recurrence.json") as List<Map<String, Any?>>).map { case ->
        dynamicTest(case["name"] as String) {
            val due = case["due"] as Map<String, Any?>
            val next = nextFutureOccurrence(
                due["local"] as String,
                due["tz"] as String,
                repeatOf(case["repeat"] as Map<String, Any?>),
                Instant.parse(case["now"] as String),
            )
            assertEquals(case["expected"], next)
        }
    }

    @Test
    fun `weekdays in any order and repeated act as the set of them`() {
        // Wednesday 2026-10-14: the next of Monday and Friday is Friday, then Monday of the next week.
        val repeat = Repeat(every = 1, unit = RepeatUnit.WEEKS, weekdays = listOf(5, 1, 5))
        assertEquals("2026-10-16T09:00", stepOccurrence("2026-10-14T09:00", "Europe/Berlin", repeat))
        assertEquals("2026-10-19T09:00", stepOccurrence("2026-10-16T09:00", "Europe/Berlin", repeat))
    }

    @Test
    fun `a step of hours keeps the minutes of the due`() {
        assertEquals("2026-10-15T00:45", stepOccurrence("2026-10-14T23:45", "UTC", Repeat(every = 1, unit = RepeatUnit.HOURS)))
    }

    @Test
    fun `stepOccurrence refuses a malformed time`() {
        assertThrows<IllegalArgumentException> { stepOccurrence("2026-10-14T09:00:00", "UTC", Repeat(every = 1, unit = RepeatUnit.DAYS)) }
    }
}
