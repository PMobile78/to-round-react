package com.pmobile78.todoround.core.contract

import com.pmobile78.todoround.core.Contract
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.DynamicTest.dynamicTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestFactory

class ValidateTest {
    private fun accepts(path: String, validate: (Any?) -> List<String>) = Contract.cases(path, "valid").map { (name, value) ->
        dynamicTest(name) { assertEquals(emptyList<String>(), validate(value)) }
    }

    private fun rejects(path: String, validate: (Any?) -> List<String>) = Contract.cases(path, "invalid").map { (name, value) ->
        dynamicTest(name) { assertNotEquals(emptyList<String>(), validate(value)) }
    }

    @TestFactory
    fun `valid tasks of the contract`() = accepts("fixtures/tasks.json") { validateTask(it) }

    @TestFactory
    fun `invalid tasks of the contract`() = rejects("fixtures/tasks.json") { validateTask(it) }

    @TestFactory
    fun `valid categories of the contract`() = accepts("fixtures/categories.json", ::validateCategory)

    @TestFactory
    fun `invalid categories of the contract`() = rejects("fixtures/categories.json", ::validateCategory)

    @TestFactory
    fun `valid settings of the contract`() = accepts("fixtures/settings.json", ::validateSettings)

    @TestFactory
    fun `invalid settings of the contract`() = rejects("fixtures/settings.json", ::validateSettings)

    @TestFactory
    fun `valid devices of the contract`() = accepts("fixtures/devices.json", ::validateDevice)

    @TestFactory
    fun `invalid devices of the contract`() = rejects("fixtures/devices.json", ::validateDevice)

    // "minimal-without-due": no due, no category, active.
    @Suppress("UNCHECKED_CAST")
    private val task = Contract.cases("fixtures/tasks.json", "valid").first().second as Map<String, Any?>

    @Test
    fun `rejects what is not a record`() {
        assertEquals(listOf("task: not an object"), validateTask(null))
        assertEquals(listOf("task: not an object"), validateTask(listOf(task)))
        assertEquals(listOf("category: not an object"), validateCategory("c1"))
        assertEquals(listOf("settings: not an object"), validateSettings(emptyList<Any>()))
        assertEquals(listOf("device: not an object"), validateDevice(null))
    }

    @Test
    fun `a missing field is not a field set to null`() {
        assertEquals(emptyList<String>(), validateTask(task + ("categoryId" to null)))
        assertEquals(listOf("categoryId: invalid"), validateTask(task - "categoryId"))
        assertEquals(listOf("repeat: invalid shape", "repeat: requires due"), validateTask(task - "repeat"))
    }

    @Test
    fun `a whole number written as a Double is an integer, a fraction is not`() {
        assertEquals(emptyList<String>(), validateTask(task + ("radius" to 45.0)))
        assertEquals(listOf("radius: invalid"), validateTask(task + ("radius" to 45.5)))
        assertEquals(listOf("radius: invalid"), validateTask(task + ("radius" to "45")))
    }

    @Test
    fun `a title of JavaScript white space only is blank`() {
        val spaces = listOf(0x20, 0x09, 0xA0, 0x2007, 0x3000, 0xFEFF).joinToString("") { Char(it).toString() }
        assertEquals(listOf("title: invalid"), validateTask(task + ("title" to spaces)))
        assertEquals(emptyList<String>(), validateTask(task + ("title" to spaces + "A" + spaces)))
    }

    @Test
    fun `a zone this device does not know passes when the caller accepts it, as the rules do`() {
        val due = mapOf("local" to "2026-10-15T09:00", "tz" to "Mars/Olympus")
        assertEquals(listOf("due.tz: invalid"), validateTask(task + ("due" to due)))
        assertEquals(emptyList<String>(), validateTask(task + ("due" to due), acceptUnknownZone = true))
        assertEquals(listOf("due.tz: invalid"), validateTask(task + ("due" to due + ("tz" to "")), acceptUnknownZone = true))
        val longZone = "x".repeat(65)
        assertEquals(listOf("due.tz: invalid"), validateTask(task + ("due" to due + ("tz" to longZone)), acceptUnknownZone = true))
    }

    @Test
    fun `times may carry micro and nanoseconds but must be UTC with Z`() {
        assertEquals(emptyList<String>(), validateTask(task + ("createdAt" to "2026-10-01T08:00:00.123456789Z")))
        assertEquals(emptyList<String>(), validateTask(task + ("createdAt" to "2026-10-01T08:00:00Z")))
        assertEquals(listOf("createdAt: invalid"), validateTask(task + ("createdAt" to "2026-10-01T08:00:00.000+02:00")))
        assertEquals(listOf("createdAt: invalid"), validateTask(task + ("createdAt" to "2026-13-01T08:00:00.000Z")))
    }

    // "android-without-permission": an Android device whose token is null.
    @Suppress("UNCHECKED_CAST")
    private val device = Contract.cases("fixtures/devices.json", "valid")[1].second as Map<String, Any?>

    @Test
    fun `a device token is null or 1 to 4096 characters, as the rules allow, and is always there`() {
        assertEquals(emptyList<String>(), validateDevice(device + ("fcmToken" to "x".repeat(4096))))
        assertEquals(listOf("fcmToken: invalid"), validateDevice(device + ("fcmToken" to "x".repeat(4097))))
        assertEquals(listOf("fcmToken: invalid"), validateDevice(device - "fcmToken"))
        assertEquals(listOf("updatedAt: invalid"), validateDevice(device + ("updatedAt" to "2026-10-02")))
    }

    @Test
    fun `isValidId takes a Firestore document id`() {
        assertEquals(true, isValidId("k3j9x0abc"))
        assertEquals(false, isValidId(""))
        assertEquals(false, isValidId("a/b"))
        assertEquals(false, isValidId("x".repeat(129)))
        assertEquals(false, isValidId(7L))
    }
}
