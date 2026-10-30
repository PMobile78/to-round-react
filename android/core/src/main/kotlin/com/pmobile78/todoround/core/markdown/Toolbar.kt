package com.pmobile78.todoround.core.markdown

/*
 * The buttons over the description field (stage 2 spec, 2.2 №3 and section 8): they put the
 * Markdown of the web's toolbar around the selection or at the starts of its lines, and leave the
 * rest of the text as it is.
 */

/** A text and its selection from [start] to [end]; a selection made backwards has [start] after [end]. */
data class Selected(val text: String, val start: Int, val end: Int)

/** The marks a button puts around the selection: bold, italic, struck through. */
enum class Emphasis(val marker: String) { BOLD("**"), ITALIC("*"), STRIKE("~~") }

/** What a button puts at the start of the lines of the selection: a bullet, a number, a checkbox. */
enum class LineStart { BULLET, NUMBER, TASK }

/**
 * The marks of [emphasis] around the selection, the spaces at its ends left outside, where the web
 * reads them; the selection stays on its text, now inside the marks. Without a selection, an empty
 * pair with the cursor between.
 */
fun Selected.emphasized(emphasis: Emphasis): Selected {
    val from = minOf(start, end)
    val to = maxOf(start, end)
    val marker = emphasis.marker
    var first = from
    var last = to
    while (first < last && text[first].isWhitespace()) first++
    while (last > first && text[last - 1].isWhitespace()) last--
    if (first == last) {
        val cursor = to + marker.length
        return Selected(text.substring(0, to) + marker + marker + text.substring(to), cursor, cursor)
    }
    val result = text.substring(0, first) + marker + text.substring(first, last) + marker + text.substring(last)
    return Selected(result, first + marker.length, last + marker.length)
}

/**
 * [lineStart] at the start of every line the selection touches: "- ", "1. ", "2. " … or "- [ ] ".
 * Of several lines the blank ones stay as they are, and a selection that ends at the start of a
 * line leaves that line; the selection moves with its text.
 */
fun Selected.listed(lineStart: LineStart): Selected {
    val from = minOf(start, end)
    val to = maxOf(start, end)
    val last = if (to > from && text[to - 1] == '\n') to - 1 else to
    val starts = mutableListOf(text.lastIndexOf('\n', from - 1) + 1)
    var newline = text.indexOf('\n', starts.first())
    while (newline != -1 && newline < last) {
        starts += newline + 1
        newline = text.indexOf('\n', newline + 1)
    }
    val lines = if (starts.size > 1) starts.filter { lineOf(it).isNotBlank() } else starts
    val inserted = lines.mapIndexed { index, at ->
        at to when (lineStart) {
            LineStart.BULLET -> "- "
            LineStart.NUMBER -> "${index + 1}. "
            LineStart.TASK -> "- [ ] "
        }
    }
    val result = StringBuilder(text)
    inserted.asReversed().forEach { (at, prefix) -> result.insert(at, prefix) }
    fun moved(position: Int) = position + inserted.filter { it.first <= position }.sumOf { it.second.length }
    return Selected(result.toString(), moved(from), moved(to))
}

/**
 * A link to [url] on the selection, "[text](url)", or "[url](url)" without one, and the cursor
 * after it; null when the web would not take the address: only http, https and mailto (spec 8).
 */
fun Selected.linked(url: String): Selected? {
    val href = url.trim()
    if (!isSafeLink(href)) return null
    val from = minOf(start, end)
    val to = maxOf(start, end)
    val link = "[" + text.substring(from, to).ifBlank { href } + "](" + href + ")"
    val cursor = from + link.length
    return Selected(text.substring(0, from) + link + text.substring(to), cursor, cursor)
}

// The line that starts at [at], without its end.
private fun Selected.lineOf(at: Int): String = text.substring(at, text.indexOf('\n', at).let { if (it == -1) text.length else it })
