package com.pmobile78.todoround.core.contract

import com.pmobile78.todoround.core.Contract
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DynamicTest.dynamicTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestFactory
import org.junit.jupiter.api.assertThrows
import java.time.DateTimeException
import java.time.Instant
import java.time.LocalDateTime

class TimeTest {
    @TestFactory
    fun `toInstant on the contract examples`() = Contract.group("fixtures/time.json", "toInstant").map { case ->
        dynamicTest(case["name"] as String) {
            val expected = Instant.parse(case["instant"] as String)
            assertEquals(expected, toInstant(case["local"] as String, case["tz"] as String))
        }
    }

    @TestFactory
    fun `toLocal on the contract examples`() = Contract.group("fixtures/time.json", "toLocal").map { case ->
        dynamicTest(case["name"] as String) {
            assertEquals(case["local"], toLocal(Instant.parse(case["instant"] as String), case["tz"] as String))
        }
    }

    @Test
    fun `parseLocal takes YYYY-MM-DDTHH mm of a real date only`() {
        assertEquals(LocalDateTime.of(2026, 10, 14, 9, 5), parseLocal("2026-10-14T09:05"))
        assertNull(parseLocal("2026-10-14T09:05:00"))
        assertNull(parseLocal("2026-10-14 09:05"))
        assertNull(parseLocal("2026-02-30T09:00"))
        assertNull(parseLocal("2026-10-14T24:00"))
        assertNull(parseLocal(""))
        assertNull(parseLocal(null))
        assertNull(parseLocal(202610140905L))
    }

    @Test
    fun `formatLocal writes minutes and drops seconds`() {
        assertEquals("2026-01-05T07:03", formatLocal(LocalDateTime.of(2026, 1, 5, 7, 3, 59)))
    }

    @Test
    fun `isValidTimeZone knows the zones of java time`() {
        assertTrue(isValidTimeZone("Europe/Kyiv"))
        assertTrue(isValidTimeZone("UTC"))
        assertFalse(isValidTimeZone("Mars/Olympus"))
        assertFalse(isValidTimeZone(""))
        assertFalse(isValidTimeZone("Europe/" + "x".repeat(60)))
        assertFalse(isValidTimeZone(null))
    }

    @Test
    fun `toInstant refuses a malformed time and an unknown zone`() {
        assertThrows<IllegalArgumentException> { toInstant("2026-10-14 09:00", "UTC") }
        assertThrows<DateTimeException> { toInstant("2026-10-14T09:00", "Mars/Olympus") }
    }
}
