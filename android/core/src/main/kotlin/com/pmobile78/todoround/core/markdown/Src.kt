package com.pmobile78.todoround.core.markdown

/*
 * Text as the web's Markdown parser sees it, with the place of each character in the description.
 * The parser cuts lines, drops their indentation and the "> " of quotes, turns tabs into spaces and
 * adds characters of its own; a Src keeps for every character its offset in the description, or -1
 * for one the parser added, so that a checkbox found anywhere maps back to the bracket it toggles.
 */

/** A view of [length] characters of a text with their offsets in the description. */
internal class Src private constructor(
    private val chars: String,
    private val origins: IntArray,
    private val from: Int,
    override val length: Int,
) : CharSequence {
    override fun get(index: Int): Char = chars[from + index]

    override fun subSequence(startIndex: Int, endIndex: Int): Src {
        require(startIndex in 0..endIndex && endIndex <= length) { "bad range $startIndex..$endIndex of $length" }
        return Src(chars, origins, from + startIndex, endIndex - startIndex)
    }

    override fun toString(): String = chars.substring(from, from + length)

    /** The offset of character [index] in the description, or -1 when the parser added it. */
    fun origin(index: Int): Int = origins[from + index]

    /** From [start] to the end; past the end it is empty, as String.prototype.slice gives. */
    fun from(start: Int): Src = subSequence(minOf(start, length), length)

    /** The first [end] characters (all of them when [end] is past the end). */
    fun upTo(end: Int): Src = subSequence(0, minOf(end, length))

    operator fun plus(other: Src): Src = join(listOf(this, other), "")

    /** The lines, as String.prototype.split("\n") gives them. */
    fun lines(): List<Src> {
        val lines = mutableListOf<Src>()
        var start = 0
        for (i in 0 until length) {
            if (this[i] == '\n') {
                lines += subSequence(start, i)
                start = i + 1
            }
        }
        lines += subSequence(start, length)
        return lines
    }

    /** The first line, without its newline. */
    fun firstLine(): Src = upTo(indexOf('\n').let { if (it < 0) length else it })

    companion object {
        /** The description itself: every character is where it is. */
        fun of(text: String): Src = Src(text, IntArray(text.length) { it }, 0, text.length)

        /** Characters the parser adds, which are nowhere in the description. */
        fun added(text: String): Src = Src(text, IntArray(text.length) { -1 }, 0, text.length)

        /** [count] spaces that stand for the character at offset [origin] (a tab). */
        fun spaces(count: Int, origin: Int): Src = withOrigin(" ".repeat(count), origin)

        /** [text] standing for the character at offset [origin]. */
        fun withOrigin(text: String, origin: Int): Src = Src(text, IntArray(text.length) { origin }, 0, text.length)

        /** [parts] one after another with [separator] (added characters) between them. */
        fun join(parts: List<Src>, separator: String): Src {
            val total = parts.sumOf { it.length } + separator.length * maxOf(0, parts.size - 1)
            val chars = CharArray(total)
            val origins = IntArray(total)
            var at = 0
            parts.forEachIndexed { i, part ->
                if (i > 0) {
                    separator.toCharArray(chars, at)
                    origins.fill(-1, at, at + separator.length)
                    at += separator.length
                }
                part.chars.toCharArray(chars, at, part.from, part.from + part.length)
                System.arraycopy(part.origins, part.from, origins, at, part.length)
                at += part.length
            }
            return Src(String(chars), origins, 0, total)
        }
    }
}

// The white space of JavaScript: \s of its regular expressions and what trim() removes.
internal fun isJsSpace(c: Char): Boolean = when (c) {
    '\t', '\n', '\u000B', '\u000C', '\r', ' ', '\u00A0', '\u1680', '\u2028', '\u2029', '\u202F', '\u205F', '\u3000', '\uFEFF' -> true
    else -> c in '\u2000'..'\u200A'
}

/** The characters that "." of a JavaScript regular expression does not match. */
internal fun isJsLineEnd(c: Char): Boolean = c == '\n' || c == '\r' || c == '\u2028' || c == '\u2029'

/** Without the JavaScript white space around it (String.prototype.trim). */
internal fun Src.jsTrim(): Src = jsTrimEnd().jsTrimStart()

internal fun Src.jsTrimStart(): Src = from(jsIndent())

internal fun Src.jsTrimEnd(): Src {
    var end = length
    while (end > 0 && isJsSpace(this[end - 1])) end--
    return upTo(end)
}

internal fun String.jsTrim(): String = trim(::isJsSpace)

internal fun CharSequence.isJsBlank(): Boolean = all(::isJsSpace)

/** The number of JavaScript white space characters at the start (the length of `^\s*`). */
internal fun CharSequence.jsIndent(): Int {
    var n = 0
    while (n < length && isJsSpace(this[n])) n++
    return n
}

/** The index of the first character that is not a plain space, or -1 (search(/[^ ]/)). */
internal fun CharSequence.firstNonSpace(): Int {
    for (i in indices) if (this[i] != ' ') return i
    return -1
}

/** Every tab as four spaces (replace(/\t/g, '    ')): the four stand for the tab. */
internal fun Src.tabsToSpaces(): Src {
    if ('\t' !in this) return this
    val parts = mutableListOf<Src>()
    var start = 0
    for (i in 0 until length) {
        if (this[i] == '\t') {
            parts += subSequence(start, i)
            parts += Src.spaces(4, origin(i))
            start = i + 1
        }
    }
    parts += from(start)
    return Src.join(parts, "")
}

/** Tabs to the next stop of four columns, counted from column [column] (expandTabs of marked). */
internal fun Src.expandTabs(column: Int): Src {
    if ('\t' !in this) return this
    val parts = mutableListOf<Src>()
    var col = column
    var start = 0
    var i = 0
    while (i < length) {
        val c = this[i]
        if (c == '\t') {
            parts += subSequence(start, i)
            val added = 4 - col % 4
            parts += Src.spaces(added, origin(i))
            col += added
            start = i + 1
        } else {
            // A surrogate pair is one character for `for (const char of line)`.
            if (c.isHighSurrogate() && i + 1 < length && this[i + 1].isLowSurrogate()) i++
            col++
        }
        i++
    }
    parts += from(start)
    return Src.join(parts, "")
}
