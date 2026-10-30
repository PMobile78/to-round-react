package com.pmobile78.todoround.core.markdown

/*
 * A description as the web shows it (stage 2 spec, section 8; data contract, section 5): the
 * document the web's editor builds from the Markdown (@tiptap/markdown 3.32 over marked 17.0.6,
 * src/utils/markdownEditor.js). Three things differ on purpose: raw HTML shows as the text it is
 * (2.2 №1) where the web reads it as formatting; a table of GFM shows as its text, line by line,
 * where the web leaves it out beside other blocks and runs its lines together when it is all the
 * description; and a description that gives no block at all shows as one paragraph of its text,
 * which the web reads as HTML. Each checkbox knows where its mark is in the description, so a tap
 * changes that one character and nothing else (2.2 №2).
 */

/** A block of a description. */
sealed interface Block {
    data class Paragraph(val content: List<Inline>) : Block

    data class Heading(val level: Int, val content: List<Inline>) : Block

    data class Quote(val blocks: List<Block>) : Block

    /** A list of bullets; each item is its blocks. */
    data class BulletList(val items: List<List<Block>>) : Block

    /** A numbered list from [start]; [type] "a", "A", "i" or "I" numbers it with letters or roman numerals. */
    data class OrderedList(val start: Int, val type: String?, val items: List<List<Block>>) : Block

    data class TaskList(val items: List<TaskItem>) : Block

    data class CodeBlock(val language: String?, val text: String) : Block

    data object Rule : Block
}

/**
 * An item of a checklist. [mark] is the offset in the description of the character between its
 * brackets, the one a tap changes, or -1 when the item cannot be changed there.
 */
data class TaskItem(val checked: Boolean, val mark: Int, val blocks: List<Block>)

/** Text inside a block. */
sealed interface Inline {
    /** Text with its marks; [link] is the address of a link. */
    data class Text(
        val text: String,
        val bold: Boolean = false,
        val italic: Boolean = false,
        val strike: Boolean = false,
        val code: Boolean = false,
        val link: String? = null,
    ) : Inline

    data object Break : Inline
}

/** The blocks of [description] as the web shows them. */
fun parseMarkdown(description: String): List<Block> {
    val lexer = Lexer()
    val tokens = lexer.lex(Src.of(description))
    val nodes = Mapper(lexer, description).parseTokens(tokens, implicitEmpty = true)
    val blocks = asBlocks(nodes)
    if (blocks.isEmpty()) {
        // The web reads such a description as HTML: its white space runs in one, and nothing is an empty paragraph.
        val text = description.trim { it in " \t\n\u000C\r" }.replace(HTML_SPACE_RUN, " ")
        return listOf(Block.Paragraph(if (text.isEmpty()) emptyList() else listOf(Inline.Text(text))))
    }
    return blocks
}

/**
 * [description] with [item] ticked or unticked: its mark becomes "x" or " ", and nothing else
 * changes. Null when the mark is no longer there, after a change from another device, say.
 */
fun toggleTask(description: String, item: TaskItem): String? {
    val at = item.mark
    if (!isMark(description, at)) return null
    val ticked = description[at] != ' '
    if (ticked != item.checked) return null
    return description.substring(0, at) + (if (ticked) ' ' else 'x') + description.substring(at + 1)
}

/** Whether a link opens: only http, https and mailto, as on the web (2.2 №1). */
fun isSafeLink(href: String): Boolean = SAFE_LINK.containsMatchIn(href)

// SAFE_LINK of src/utils/markdownEditor.js: /^(https?:|mailto:)/i
private val SAFE_LINK = Regex("^(?:[hH][tT][tT][pP][sS]?:|[mM][aA][iI][lL][tT][oO]:)")

private val HTML_SPACE_RUN = Regex("[ \\t\\n\\u000C\\r]+")

// The character at [at] is the mark of a checkbox: "[", one of " xX", "]".
private fun isMark(description: String, at: Int): Boolean =
    at >= 1 && at + 1 < description.length && description[at - 1] == '[' && description[at] in " xX" && description[at + 1] == ']'

// A node of the web's document: a block, or text the web puts where a block goes.
private sealed interface Node

private class BlockNode(val block: Block) : Node

private class InlineNode(val inline: Inline) : Node

// The web keeps text where a block goes (an image alone, a list item of text); it shows as a paragraph.
private fun asBlocks(nodes: List<Node>): List<Block> {
    val blocks = mutableListOf<Block>()
    val run = mutableListOf<Inline>()
    for (node in nodes) {
        when (node) {
            is InlineNode -> run += node.inline
            is BlockNode -> {
                if (run.isNotEmpty()) {
                    blocks += Block.Paragraph(merged(run.toList()))
                    run.clear()
                }
                blocks += node.block
            }
        }
    }
    if (run.isNotEmpty()) blocks += Block.Paragraph(merged(run))
    return blocks
}

// Neighbouring texts with the same marks as one text, as the web's parseInlineTokens joins them.
private fun merged(inlines: List<Inline>): List<Inline> {
    val result = mutableListOf<Inline>()
    for (inline in inlines) {
        val last = result.lastOrNull()
        if (inline is Inline.Text && last is Inline.Text && inline.copy(text = "") == last.copy(text = "")) {
            result[result.lastIndex] = last.copy(text = last.text + inline.text)
        } else {
            result += inline
        }
    }
    return result
}

/** The tokens to the web's document, as the MarkdownManager of @tiptap/markdown and its extensions build it. */
private class Mapper(private val lexer: Lexer, private val description: String) {
    // parseTokens: with [implicitEmpty], runs of blank lines become empty paragraphs (parseBlockChildren).
    fun parseTokens(tokens: List<Tok>, implicitEmpty: Boolean): List<Node> {
        val normalized = if (implicitEmpty) extractAbsorbedBlankLines(tokens) else tokens
        val nonSpace = normalized.indices.filter { normalized[it] !is SpaceTok }
        val nodes = mutableListOf<Node>()
        for ((index, token) in normalized.withIndex()) {
            if (implicitEmpty && token is SpaceTok) {
                val previous = nonSpace.lastOrNull { it < index } ?: -1
                val next = nonSpace.firstOrNull { it > index } ?: -1
                val separators = countParagraphSeparators(token.raw.toString())
                val count = maxOf(separators - (if (previous == -1 || next == -1) 0 else 1), 0)
                repeat(count) { nodes += BlockNode(Block.Paragraph(emptyList())) }
                continue
            }
            nodes += parseToken(token, implicitEmpty)
        }
        return nodes
    }

    // extractAbsorbedBlankLines: blank lines at the end of a token's raw become a space token after it.
    private fun extractAbsorbedBlankLines(tokens: List<Tok>): List<Tok> = tokens.flatMapIndexed { index, token ->
        if (token is SpaceTok || tokens.getOrNull(index + 1) is SpaceTok) return@flatMapIndexed listOf(token)
        val raw = token.raw
        val trailing = trailingBlankLines(raw)
        if (trailing == 0) listOf(token) else listOf(token.withRaw(raw.upTo(raw.length - trailing)), SpaceTok(raw.from(raw.length - trailing)))
    }

    // TRAILING_BLANK_LINES: /\n[^\S\n]*(?:\n[^\S\n]*)+$/ — the length of the match, or 0.
    private fun trailingBlankLines(raw: CharSequence): Int {
        var i = raw.length
        var newlines = 0
        var first = -1
        while (i > 0 && isJsSpace(raw[i - 1])) {
            i--
            if (raw[i] == '\n') {
                newlines++
                first = i
            }
        }
        return if (newlines >= 2) raw.length - first else 0
    }

    // countParagraphSeparators: the "\n\n" in the raw, one after another.
    private fun countParagraphSeparators(raw: String): Int {
        var count = 0
        var i = 0
        val text = raw.replace("\r\n", "\n")
        while (true) {
            val at = text.indexOf("\n\n", i)
            if (at < 0) return count
            count++
            i = at + 2
        }
    }

    private fun parseToken(token: Tok, implicitEmpty: Boolean): List<Node> = when (token) {
        is ListTok -> parseList(token)
        is ParagraphTok -> paragraph(token.inline)
        is HeadingTok -> listOf(BlockNode(Block.Heading(token.depth, parseInline(token.inline))))
        is QuoteTok -> listOf(BlockNode(Block.Quote(asBlocks(parseTokens(token.tokens, implicitEmpty = true)))))
        is CodeTok -> code(token)
        is HrTok -> listOf(BlockNode(Block.Rule))
        is HtmlTok -> htmlAsText(token.raw.toString(), block = true)
        // The text extension of TipTap keeps the text as written.
        is TextTok -> listOf(InlineNode(Inline.Text(token.text)))
        is TaskListTok -> listOf(BlockNode(Block.TaskList(token.items.map(::taskItem))))
        is TableTok -> listOf(BlockNode(Block.Paragraph(listOf(Inline.Text(token.raw.toString().jsTrimEndString())))))
        is TaskItemTok, is ItemTok, is SpaceTok, is DefTok, is CheckboxTok -> emptyList()
    }

    // Paragraph.parseMarkdown: an image alone goes through parseChildren, the rest is inline.
    private fun paragraph(tokens: List<Inl>): List<Node> {
        if (tokens.size == 1 && tokens[0] is LinkInl && (tokens[0] as LinkInl).image) return inlineAsBlocks(tokens)
        val content = parseInline(tokens)
        val only = tokens.singleOrNull()
        if (only is TextInl && (only.raw in EMPTY_PARAGRAPH || only.text in EMPTY_PARAGRAPH) &&
            content.singleOrNull().let { it is Inline.Text && it.text in EMPTY_PARAGRAPH }
        ) {
            return listOf(BlockNode(Block.Paragraph(emptyList())))
        }
        return listOf(BlockNode(Block.Paragraph(content)))
    }

    // CodeBlock.parseMarkdown, and since the web's 0.2.7 a fence with spaces before it too.
    private fun code(token: CodeTok): List<Node> {
        return listOf(BlockNode(Block.CodeBlock(token.lang?.ifEmpty { null }, token.text)))
    }

    private fun taskItem(token: TaskItemTok): TaskItem {
        val first = when {
            token.inline.isNotEmpty() -> Block.Paragraph(parseInline(token.inline))
            token.text.isNotEmpty() -> Block.Paragraph(listOf(Inline.Text(token.text)))
            else -> Block.Paragraph(emptyList())
        }
        val nested = token.nested?.let { asBlocks(parseTokens(it, implicitEmpty = false)) }.orEmpty()
        val mark = if (isMarkAt(token.mark)) token.mark else -1
        return TaskItem(token.checked, mark, listOf(first) + nested)
    }

    private fun isMarkAt(at: Int): Boolean =
        at >= 1 && at + 1 < description.length && description[at - 1] == '[' && description[at] in " xX" && description[at + 1] == ']'

    // parseListToken: a list of tasks and bullets is cut into a task list and lists, each task taken from its raw.
    private fun parseList(token: ListTok): List<Node> {
        if (token.items.isEmpty()) return listWithHandlers(token)
        val tasks = token.items.map { taskOf(it) }
        if (tasks.all { it == null } || tasks.all { it != null }) return listWithHandlers(token)
        val nodes = mutableListOf<Node>()
        var start = 0
        while (start < token.items.size) {
            val isTask = tasks[start] != null
            var end = start
            while (end < token.items.size && (tasks[end] != null) == isTask) end++
            if (isTask) {
                nodes += BlockNode(Block.TaskList((start until end).map { taskFromRaw(token.items[it], tasks[it]!!) }))
            } else {
                nodes += listWithHandlers(ListTok(token.raw, token.ordered, token.start, token.typeMarker, token.items.subList(start, end)))
            }
            start = end
        }
        return nodes
    }

    // isTaskItem: /^(\s*)[-+*]\s+\[([ xX])\]\s+/ on the raw of the item — its checkbox, or null.
    private fun taskOf(item: ItemTok): Pair<Boolean, Int>? {
        val raw = item.raw
        val bracket = taskStartAt(raw, 0)
        if (bracket < 0) return null
        return (raw[bracket + 1] != ' ') to raw.origin(bracket + 1)
    }

    private fun taskFromRaw(item: ItemTok, task: Pair<Boolean, Int>): TaskItem {
        val lines = item.raw.lines()
        val main = taskLine(lines[0])?.content?.toString() ?: ""
        var nested = emptyList<Node>()
        if (lines.size > 1 && !Src.join(lines.drop(1), "\n").isJsBlank()) {
            val nestedLines = lines.drop(1)
            val minIndent = nestedLines.filter { !it.isJsBlank() }.minOf { it.jsIndent() }
            val content = Src.join(nestedLines.map { if (it.isJsBlank()) Src.added("") else it.from(minIndent) }, "\n").jsTrim()
            if (content.isNotEmpty()) nested = parseTokens(Lexer().lex(content + Src.added("\n")), implicitEmpty = false)
        }
        val inline = lexer.inlineTokens(main)
        val first = when {
            inline.isNotEmpty() -> Block.Paragraph(parseInline(inline))
            main.isNotEmpty() -> Block.Paragraph(listOf(Inline.Text(main)))
            else -> Block.Paragraph(emptyList())
        }
        val mark = if (isMarkAt(task.second)) task.second else -1
        return TaskItem(task.first, mark, listOf(first) + asBlocks(nested))
    }

    // The handlers of a list token: BulletList, else OrderedList with parseListItems.
    private fun listWithHandlers(token: ListTok): List<Node> {
        if (!token.ordered) return listOf(BlockNode(Block.BulletList(token.items.map(::listItem))))
        val start = if (token.start == 0) 1 else token.start
        return listOf(BlockNode(Block.OrderedList(start, token.typeMarker, token.items.map(::orderedItem))))
    }

    // ListItem.parseMarkdown
    private fun listItem(item: ItemTok): List<Block> {
        val tokens = item.tokens
        var content = emptyList<Node>()
        if (tokens.isNotEmpty()) {
            val first = tokens[0]
            if (sameLineOrderedList(item)) {
                val text = item.text.toString()
                return listOf(Block.Paragraph(parseInline(lexer.inlineTokens(text))))
            }
            content = if (tokens.any { it is ParagraphTok }) {
                parseTokens(tokens, implicitEmpty = true)
            } else if (first is TextTok && first.inline.isNotEmpty()) {
                listOf<Node>(BlockNode(Block.Paragraph(parseInline(first.inline)))) +
                    if (tokens.size > 1) parseTokens(tokens.drop(1), implicitEmpty = true) else emptyList()
            } else {
                parseTokens(tokens, implicitEmpty = true)
            }
        }
        if (content.isEmpty()) return listOf(Block.Paragraph(emptyList()))
        return asBlocks(content)
    }

    // isSameLineOrderedListToken: "- 1. text" keeps "1. text" as the text of the item.
    private fun sameLineOrderedList(item: ItemTok): Boolean {
        val text = item.text?.toString() ?: return false
        val only = item.tokens.singleOrNull()
        return text.isNotEmpty() && only is ListTok && only.ordered && only.raw.toString() == text
    }

    // parseListItems of the ordered list.
    private fun orderedItem(item: ItemTok): List<Block> {
        val content = mutableListOf<Node>()
        for (token in item.tokens) {
            when (token) {
                is ParagraphTok, is ListTok, is QuoteTok, is CodeTok -> content += parseTokens(listOf(token), implicitEmpty = false)
                is TextTok -> content += BlockNode(Block.Paragraph(listOf(Inline.Text(token.text))))
                else -> content += parseTokens(listOf(token), implicitEmpty = false)
            }
        }
        return asBlocks(content)
    }

    // parseInlineTokens of the MarkdownManager.
    fun parseInline(tokens: List<Inl>): List<Inline> {
        val result = mutableListOf<Inline>()
        for (token in tokens) {
            when (token) {
                is TextInl -> result += Inline.Text(decodeHtmlEntities(token.text))
                is EscapeInl -> result += Inline.Text(token.text)
                is HtmlInl -> result += Inline.Text(token.raw)
                is StrongInl -> result += parseInline(token.tokens).map { it.marked { copy(bold = true) } }
                is EmInl -> result += parseInline(token.tokens).map { it.marked { copy(italic = true) } }
                is DelInl -> result += parseInline(token.tokens).map { it.marked { copy(strike = true) } }
                is CodespanInl -> result += Inline.Text(token.text, code = true)
                is LinkInl -> result += if (token.image) {
                    parseInline(token.tokens)
                } else {
                    parseInline(token.tokens).map { it.marked { if (link == null) copy(link = token.href) else this } }
                }
                is BrInl -> result += Inline.Break
                CheckboxInl -> Unit
            }
        }
        return merged(result)
    }

    // The tokens of an image alone in a paragraph go through parseTokens, as if they were blocks.
    private fun inlineAsBlocks(tokens: List<Inl>): List<Node> = tokens.flatMap { token ->
        when (token) {
            is TextInl -> listOf(InlineNode(Inline.Text(token.text)))
            is EscapeInl -> listOf(InlineNode(Inline.Text(token.text)))
            is HtmlInl -> htmlAsText(token.raw, block = false)
            is LinkInl -> if (token.image) inlineAsBlocks(token.tokens) else parseInline(listOf(token)).map(::InlineNode)
            is StrongInl, is EmInl, is DelInl, is CodespanInl -> parseInline(listOf(token)).map(::InlineNode)
            is BrInl -> listOf(InlineNode(Inline.Break))
            CheckboxInl -> emptyList()
        }
    }

    // htmlAsLiteralText: the HTML without the white space at its end, as a paragraph or as text.
    private fun htmlAsText(html: String, block: Boolean): List<Node> {
        val text = html.trimEnd(::isJsSpace)
        if (text.isEmpty()) return emptyList()
        return listOf(if (block) BlockNode(Block.Paragraph(listOf(Inline.Text(text)))) else InlineNode(Inline.Text(text)))
    }

    private fun Inline.marked(change: Inline.Text.() -> Inline.Text): Inline = if (this is Inline.Text) change() else this
}

private val EMPTY_PARAGRAPH = setOf("&nbsp;", "\u00A0")

private fun String.jsTrimEndString(): String = trimEnd(::isJsSpace)

private fun Tok.withRaw(raw: Src): Tok {
    this.raw = raw
    return this
}

private val ENTITY = Regex("&(?:#([0-9]{1,7})|#[xX]([0-9a-fA-F]{1,6})|(lt|gt|quot|amp));")

private val WINDOWS_1252 = mapOf(
    128 to 8364, 130 to 8218, 131 to 402, 132 to 8222, 133 to 8230, 134 to 8224, 135 to 8225, 136 to 710,
    137 to 8240, 138 to 352, 139 to 8249, 140 to 338, 142 to 381, 145 to 8216, 146 to 8217, 147 to 8220,
    148 to 8221, 149 to 8226, 150 to 8211, 151 to 8212, 152 to 732, 153 to 8482, 154 to 353, 155 to 8250,
    156 to 339, 158 to 382, 159 to 376,
)

// decodeHtmlEntities of @tiptap/core: the numeric entities and &lt; &gt; &quot; &amp;.
private fun decodeHtmlEntities(text: String): String {
    if ('&' !in text) return text
    return ENTITY.replace(text) { m ->
        val (dec, hex, name) = m.destructured
        when {
            dec.isNotEmpty() -> codePoint(dec.toInt())
            hex.isNotEmpty() -> codePoint(hex.toInt(16))
            else -> mapOf("lt" to "<", "gt" to ">", "quot" to "\"", "amp" to "&").getValue(name)
        }
    }
}

private fun codePoint(value: Int): String {
    if (value == 0 || value > 0x10FFFF || value in 0xD800..0xDFFF) return "\uFFFD"
    return String(Character.toChars(WINDOWS_1252[value] ?: value))
}
