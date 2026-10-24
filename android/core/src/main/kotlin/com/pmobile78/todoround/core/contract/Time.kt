package com.pmobile78.todoround.core.contract

import java.time.DateTimeException
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.time.format.ResolverStyle
import java.time.temporal.ChronoUnit

/*
 * Wall-clock ("local") time <-> instant (spec 4.2). `local` is "YYYY-MM-DDTHH:mm" without an
 * offset; `tz` is an IANA zone. java.time is the reference of the contract: a nonexistent local
 * time (spring gap) moves forward by the length of the gap, an ambiguous one (autumn overlap)
 * takes the earlier offset. The web gives the same results (src/contract/time.js).
 */

private val LOCAL_RE = Regex("""\d{4}-\d{2}-\d{2}T\d{2}:\d{2}""")
private val LOCAL_FORMAT = DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm").withResolverStyle(ResolverStyle.STRICT)

/** The date and time of "YYYY-MM-DDTHH:mm", or null when it is malformed or not a real date. */
fun parseLocal(local: Any?): LocalDateTime? {
    if (local !is String || !LOCAL_RE.matches(local)) return null
    return try {
        LocalDateTime.parse(local, LOCAL_FORMAT)
    } catch (e: DateTimeParseException) {
        null
    }
}

/** "YYYY-MM-DDTHH:mm" of a date and time; seconds are dropped. */
fun formatLocal(dateTime: LocalDateTime): String = dateTime.truncatedTo(ChronoUnit.MINUTES).format(LOCAL_FORMAT)

// The zones of the base, read once: getAvailableZoneIds() builds a new set on every call.
private val KNOWN_ZONES: Set<String> by lazy { ZoneId.getAvailableZoneIds() }

/**
 * True when [tz] is a zone of the base of java.time, at most 64 characters long. Ids such as
 * "GMT+03:00", which Android gives a zone set by hand and ZoneId.of takes too, are not: the web
 * and the functions do not know them (stage 2 spec, 2.2 №5). Nor are "+05:00" and a name in
 * another case, which the web's Intl does know; no client writes such zones.
 */
fun isValidTimeZone(tz: Any?): Boolean = tz is String && tz.length in 1..64 && tz in KNOWN_ZONES

/** The instant of [local] in zone [tz]; throws on a malformed time or an unknown zone. */
fun toInstant(local: String, tz: String): Instant {
    val dateTime = parseLocal(local) ?: throw IllegalArgumentException("Invalid local date-time: $local")
    return dateTime.atZone(ZoneId.of(tz)).toInstant()
}

/** "YYYY-MM-DDTHH:mm" of [instant] in zone [tz]. */
fun toLocal(instant: Instant, tz: String): String = formatLocal(LocalDateTime.ofInstant(instant, ZoneId.of(tz)))

/** The zone of this device, or "UTC" when it cannot be read. */
fun deviceTimeZone(): String = try {
    ZoneId.systemDefault().id
} catch (e: DateTimeException) {
    "UTC"
}
