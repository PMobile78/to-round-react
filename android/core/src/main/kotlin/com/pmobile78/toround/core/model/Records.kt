package com.pmobile78.toround.core.model

import java.time.Instant

/*
 * Reading values of a record that a validator has accepted: whole numbers come as Long (Firestore)
 * or as a Double without a fraction (JavaScript), times as ISO strings.
 */

internal fun Map<String, Any?>.int(key: String): Int = when (val value = get(key)) {
    is Long -> value.toInt()
    is Int -> value
    is Double -> value.toInt()
    else -> throw IllegalArgumentException("$key: not a number")
}

internal fun Map<String, Any?>.double(key: String): Double = (get(key) as Number).toDouble()

internal fun Map<String, Any?>.string(key: String): String = get(key) as String

internal fun Map<String, Any?>.stringOrNull(key: String): String? = get(key) as String?

internal fun Map<String, Any?>.boolean(key: String): Boolean = get(key) as Boolean

internal fun Map<String, Any?>.instant(key: String): Instant = Instant.parse(string(key))

internal fun Map<String, Any?>.instantOrNull(key: String): Instant? = stringOrNull(key)?.let(Instant::parse)

@Suppress("UNCHECKED_CAST")
internal fun Map<String, Any?>.map(key: String): Map<String, Any?> = get(key) as Map<String, Any?>

@Suppress("UNCHECKED_CAST")
internal fun Map<String, Any?>.mapOrNull(key: String): Map<String, Any?>? = get(key) as Map<String, Any?>?

internal fun Map<String, Any?>.ints(key: String): List<Int> = (get(key) as List<*>).map { (it as Number).toInt() }

@Suppress("UNCHECKED_CAST")
internal fun Map<String, Any?>.stringsOrNull(key: String): List<String>? = get(key) as List<String>?
