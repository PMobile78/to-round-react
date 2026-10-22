package com.pmobile78.todoround.core

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.longOrNull
import java.io.File

/**
 * The shared examples of the repository (contract/) as plain values, the way Firestore gives them
 * to Android: maps, lists, String, Boolean, Long for whole numbers, Double otherwise, and null.
 */
object Contract {
    private val dir = File(System.getProperty("todoround.contractDir") ?: error("todoround.contractDir is not set"))

    /** The whole file, e.g. read("palette.json"). */
    fun read(path: String): Any? = plain(Json.parseToJsonElement(File(dir, path).readText()))

    /** The entries of one list of a fixture file, e.g. group("fixtures/time.json", "toInstant"). */
    @Suppress("UNCHECKED_CAST")
    fun group(path: String, key: String): List<Map<String, Any?>> =
        (read(path) as Map<String, Any?>)[key] as List<Map<String, Any?>>

    /** The named examples of a fixture group: [{ "name": …, "value": … }] → name to value. */
    fun cases(path: String, key: String): List<Pair<String, Any?>> =
        group(path, key).map { it["name"] as String to it["value"] }

    private fun plain(element: JsonElement): Any? = when (element) {
        JsonNull -> null
        is JsonObject -> element.mapValues { plain(it.value) }
        is JsonArray -> element.map { plain(it) }
        is JsonPrimitive -> when {
            element.isString -> element.content
            element.booleanOrNull != null -> element.booleanOrNull
            element.longOrNull != null -> element.longOrNull
            else -> element.double
        }
    }
}
