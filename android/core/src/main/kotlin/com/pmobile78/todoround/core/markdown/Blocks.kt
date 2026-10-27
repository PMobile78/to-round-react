package com.pmobile78.todoround.core.markdown

/*
 * The block level of the web's Markdown: the block lexer of marked 17.0.6 (src/Lexer.ts and
 * src/Tokenizer.ts, GFM on) with the two tokenizers TipTap 3.32 adds in front of it, task lists
 * (@tiptap/extension-list, task-list.ts) and ordered lists with numbers, letters or roman numerals
 * (ordered-list.ts). Each rule is written out by hand as the regular expression of marked reads:
 * Android runs java.util.regex on ICU and the tests run it on the JDK, and the two differ on \s,
 * \b and case folding, so the rules use none of them.
 */

/** A block token of marked or TipTap; [raw] is the text it took. */
internal sealed class Tok {
    abstract var raw: Src
}

internal class SpaceTok(override var raw: Src) : Tok()

internal class CodeTok(override var raw: Src, val text: String, val lang: String?) : Tok()

internal class HeadingTok(override var raw: Src, val depth: Int, val inline: MutableList<Inl>) : Tok()

internal class HrTok(override var raw: Src) : Tok()

internal class QuoteTok(override var raw: Src, val tokens: MutableList<Tok>) : Tok()

internal class HtmlTok(override var raw: Src) : Tok()

internal class DefTok(override var raw: Src) : Tok()

internal class TableTok(override var raw: Src) : Tok()

/**
 * A paragraph or a line of text. marked joins the lines after it to it one by one, as strings of
 * JavaScript join cheaply: the raw and the text here grow in parts and join when read.
 */
internal sealed class TextBlockTok(raw: Src, text: String, val inline: MutableList<Inl>) : Tok() {
    private val rawParts = mutableListOf(raw)
    private val textPart = StringBuilder(text)

    override var raw: Src
        get() {
            if (rawParts.size > 1) {
                val joined = Src.join(rawParts, "")
                rawParts.clear()
                rawParts += joined
            }
            return rawParts[0]
        }
        set(value) {
            rawParts.clear()
            rawParts += value
        }

    var text: String
        get() = textPart.toString()
        set(value) {
            textPart.setLength(0)
            textPart.append(value)
        }

    /** The raw goes on with [raw] after a newline it does not end with, the text with a newline and [text]. */
    fun append(raw: Src, text: String) {
        if (!rawEndsWithNewline()) rawParts += Src.added("\n")
        rawParts += raw
        textPart.append('\n').append(text)
    }

    fun appendNewline() {
        rawParts += Src.added("\n")
    }

    private fun rawEndsWithNewline(): Boolean {
        for (part in rawParts.asReversed()) if (part.isNotEmpty()) return part[part.length - 1] == '\n'
        return false
    }
}

internal class ParagraphTok(raw: Src, text: String, inline: MutableList<Inl>) : TextBlockTok(raw, text, inline)

internal class TextTok(raw: Src, text: String, inline: MutableList<Inl>) : TextBlockTok(raw, text, inline)

/** marked's checkbox of a task item in its own list; TipTap shows nothing for it. */
internal class CheckboxTok(override var raw: Src) : Tok()

/** A list of marked, or an ordered list of TipTap ([typeMarker] "a", "A", "i" or "I" for letters and numerals). */
internal class ListTok(
    override var raw: Src,
    val ordered: Boolean,
    val start: Int,
    val typeMarker: String?,
    val items: List<ItemTok>,
) : Tok()

/** An item of a list; [text] is null for the items of TipTap's ordered lists. */
internal class ItemTok(override var raw: Src, var text: Src?, val tokens: MutableList<Tok>) : Tok()

internal class TaskListTok(override var raw: Src, val items: List<TaskItemTok>) : Tok()

/** A task item of TipTap; [mark] is the offset in the description of the character between its brackets. */
internal class TaskItemTok(
    val checked: Boolean,
    val mark: Int,
    val text: String,
    val inline: List<Inl>,
    val nested: List<Tok>?,
) : Tok() {
    override var raw: Src = Src.added("")
}

/** A link definition, `[label]: href "title"`. */
internal class LinkDef(val href: String, val title: String?)

/** The lexer of one parse: its state, link definitions and inline queue, as marked's _Lexer keeps them. */
internal class Lexer {
    var top = true
    var inLink = false
    var inRawBlock = false
    val links = mutableMapOf<String, LinkDef>()

    private class Queued(val src: StringBuilder, val target: MutableList<Inl>)

    private val queue = mutableListOf<Queued>()

    /** The tokens of [src], their inline content lexed at the end, as marked.lexer gives them. */
    fun lex(src: Src): MutableList<Tok> {
        val tokens = blockTokens(withoutCarriageReturns(src), mutableListOf())
        for (entry in queue) entry.target.addAll(inlineTokens(entry.src.toString()))
        queue.clear()
        return tokens
    }

    fun inlineTokens(src: String): List<Inl> = InlineLexer(this).tokens(src)

    private fun inline(src: String): MutableList<Inl> {
        val target = mutableListOf<Inl>()
        queue += Queued(StringBuilder(src), target)
        return target
    }

    fun blockTokens(start: Src, tokens: MutableList<Tok> = mutableListOf(), lastParagraphClippedAtStart: Boolean = false): MutableList<Tok> {
        var src = start
        var lastParagraphClipped = lastParagraphClippedAtStart
        while (src.isNotEmpty()) {
            // TipTap's tokenizers come first; marked tries the one added last first.
            val ext = taskList(src) ?: orderedList(src)
            if (ext != null) {
                src = src.from(ext.raw.length)
                tokens += ext
                continue
            }
            var n = space(src)
            if (n > 0) {
                val raw = src.upTo(n)
                src = src.from(n)
                val last = tokens.lastOrNull()
                if (n == 1 && last is TextBlockTok) {
                    last.appendNewline()
                } else if (n == 1 && last != null) {
                    last.raw = last.raw + Src.added("\n")
                } else {
                    tokens += SpaceTok(raw)
                }
                continue
            }
            val code = code(src)
            if (code != null) {
                src = src.from(code.raw.length)
                val last = tokens.lastOrNull()
                // An indented code block cannot interrupt a paragraph.
                if (last is TextBlockTok) {
                    mergeInto(last, code.raw, code.text)
                } else {
                    tokens += code
                }
                continue
            }
            val other = fences(src) ?: heading(src) ?: hr(src) ?: blockquote(src) ?: list(src) ?: html(src)
            if (other != null) {
                src = src.from(other.raw.length)
                tokens += other
                continue
            }
            val def = def(src)
            if (def != null) {
                src = src.from(def.first.raw.length)
                val last = tokens.lastOrNull()
                if (last is TextBlockTok) {
                    mergeInto(last, def.first.raw, def.first.raw.toString())
                } else if (def.second !in links) {
                    links[def.second] = def.third
                    tokens += def.first
                }
                continue
            }
            val more = table(src) ?: lheading(src)
            if (more != null) {
                src = src.from(more.raw.length)
                tokens += more
                continue
            }
            // A paragraph stops where a task list of TipTap starts (marked's startBlock).
            val cutSrc = if (taskListStartsAfterFirst(src)) src.upTo(1) else src
            if (top) {
                n = paragraph(cutSrc)
                if (n > 0) {
                    val raw = cutSrc.upTo(n)
                    val text = raw.toString()
                    val last = tokens.lastOrNull()
                    if (lastParagraphClipped && last is ParagraphTok) {
                        mergeInto(last, raw, text)
                    } else {
                        tokens += ParagraphTok(raw, text, inline(text))
                    }
                    lastParagraphClipped = cutSrc.length != src.length
                    src = src.from(n)
                    continue
                }
            }
            n = src.indexOf('\n').let { if (it < 0) src.length else it }
            if (n > 0) {
                val raw = src.upTo(n)
                val text = raw.toString()
                src = src.from(n)
                val last = tokens.lastOrNull()
                if (last is TextTok) {
                    mergeInto(last, raw, text)
                } else {
                    tokens += TextTok(raw, text, inline(text))
                }
                continue
            }
            error("Infinite loop on byte: ${src[0].code}")
        }
        top = true
        return tokens
    }

    // The raw and the text of [token] go on with [raw] and [text], and so does the source of its inline
    // content: the last entry of the queue is the token's own, which holds its text.
    private fun mergeInto(token: TextBlockTok, raw: Src, text: String) {
        token.append(raw, text)
        queue.last().src.append('\n').append(text)
    }

    // ---------- marked's block tokenizers ----------

    // newline: /^(?:[ \t]*(?:\n|$))+/
    private fun space(src: Src): Int {
        var pos = 0
        while (true) {
            var p = pos
            while (p < src.length && (src[p] == ' ' || src[p] == '\t')) p++
            if (p < src.length && src[p] == '\n') {
                pos = p + 1
                continue
            }
            if (p == src.length) pos = p
            return pos
        }
    }

    // code: /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/
    private fun code(src: Src): CodeTok? {
        var pos = 0
        while (true) {
            val content = codeIndent(src, pos)
            if (content < 0) break
            val end = lineEnd(src, content)
            if (end == content) break
            pos = end
            if (pos < src.length && src[pos] == '\n') {
                pos++
                while (true) {
                    var r = pos
                    while (r < src.length && (src[r] == ' ' || src[r] == '\t')) r++
                    if (r < src.length && src[r] == '\n') {
                        pos = r + 1
                    } else {
                        if (r == src.length) pos = r
                        break
                    }
                }
            }
            if (pos >= src.length) break
        }
        if (pos == 0) return null
        val raw = src.upTo(pos)
        // text: raw.replace(/^(?: {1,4}| {0,3}\t)/gm, '') without the newlines at its end
        val text = raw.toString().split('\n').joinToString("\n") { line ->
            val spaces = line.takeWhile { it == ' ' }.length
            when {
                spaces > 0 -> line.substring(minOf(spaces, 4))
                line.startsWith('\t') -> line.substring(1)
                else -> line
            }
        }.trimEnd('\n')
        return CodeTok(raw, text, lang = null)
    }

    // The start of the code after the indentation of an indented code line at [at], or -1.
    private fun codeIndent(src: Src, at: Int): Int {
        var i = 0
        while (i < 4 && at + i < src.length && src[at + i] == ' ') i++
        if (i == 4) return at + 4
        if (at + i < src.length && src[at + i] == '\t') return at + i + 1
        return -1
    }

    // fences: /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/
    private fun fences(src: Src): CodeTok? {
        val p = spacesUpTo(src, 0, 3)
        if (p >= src.length || (src[p] != '`' && src[p] != '~')) return null
        val fence = src[p]
        var q = p
        while (q < src.length && src[q] == fence) q++
        if (q - p < 3) return null
        val infoEnd = lineEnd(src, q)
        if (fence == '`' && (q until infoEnd).any { src[it] == '`' }) return null
        val opening = src.subSequence(p, q).toString()
        val info = src.subSequence(q, infoEnd).toString()
        val contentStart = if (infoEnd < src.length) infoEnd + 1 else infoEnd
        var end = -1
        var content: String? = null
        val emptyClose = closingFence(src, contentStart, opening)
        if (emptyClose >= 0) {
            end = emptyClose
        } else if (contentStart == src.length) {
            end = contentStart
        } else {
            var at = contentStart
            while (end < 0) {
                if (at == src.length) {
                    content = src.subSequence(contentStart, at).toString()
                    end = at
                } else if (src[at] == '\n') {
                    val close = closingFence(src, at + 1, opening)
                    if (close >= 0) {
                        content = src.subSequence(contentStart, at).toString()
                        end = close
                    } else if (at + 1 == src.length) {
                        content = src.subSequence(contentStart, at).toString()
                        end = at + 1
                    }
                }
                at++
            }
        }
        val raw = src.upTo(end)
        val lang = if (info.isEmpty()) null else unescapePunctuation(info.jsTrim())
        return CodeTok(raw, indentCodeCompensation(raw.toString(), content ?: ""), lang)
    }

    // The end of a closing fence ` {0,3}<opening>[~`]* *` that starts a line at [at] and fills it, or -1.
    private fun closingFence(src: Src, at: Int, opening: String): Int {
        if (at > src.length) return -1
        val p = spacesUpTo(src, at, 3)
        if (!src.startsWith(opening, p)) return -1
        var q = p + opening.length
        while (q < src.length && (src[q] == '~' || src[q] == '`')) q++
        while (q < src.length && src[q] == ' ') q++
        return if (q == src.length || src[q] == '\n') q else -1
    }

    // indentCodeCompensation of marked: the lines of a fenced code lose the indentation of its fence.
    private fun indentCodeCompensation(raw: String, text: String): String {
        val indent = raw.jsIndent()
        if (indent == 0 || !raw.startsWith("```", indent)) return text
        return text.split('\n').joinToString("\n") { line ->
            val own = line.jsIndent()
            if (own > 0 && own >= indent) line.substring(indent) else line
        }
    }

    // heading: /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/
    private fun heading(src: Src): HeadingTok? {
        val p = spacesUpTo(src, 0, 3)
        var q = p
        while (q < src.length && src[q] == '#') q++
        val depth = q - p
        if (depth !in 1..6) return null
        if (q < src.length && !isJsSpace(src[q])) return null
        var end = q
        while (end < src.length && !isJsLineEnd(src[end])) end++
        if (end < src.length && src[end] != '\n') return null
        val textEnd = end
        while (end < src.length && src[end] == '\n') end++
        var text = src.subSequence(q, textEnd).toString().jsTrim()
        if (text.endsWith('#')) {
            val trimmed = text.trimEnd('#')
            if (trimmed.isEmpty() || trimmed.endsWith(' ')) text = trimmed.jsTrim()
        }
        return HeadingTok(src.upTo(end), depth, inline(text))
    }

    private fun hr(src: Src): HrTok? {
        val n = hrLength(src, 0, 3, tabs = true)
        if (n < 0) return null
        var end = n
        while (end > 0 && src[end - 1] == '\n') end--
        return HrTok(src.upTo(end))
    }

    // hr: /^ {0,maxSpaces}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/ at [at]: the length
    // of the match with its newlines, or -1. In list items marked allows spaces only between the marks.
    private fun hrLength(src: Src, at: Int, maxSpaces: Int, tabs: Boolean): Int {
        val p = spacesUpTo(src, at, maxSpaces)
        if (p >= src.length || src[p] !in "-_*") return -1
        val mark = src[p]
        var count = 0
        var q = p
        while (q < src.length) {
            val c = src[q]
            if (c == mark) count++ else if (c != ' ' && !(tabs && c == '\t')) break
            q++
        }
        if (count < 3) return -1
        if (q < src.length && src[q] != '\n') return -1
        while (q < src.length && src[q] == '\n') q++
        return q - at
    }

    // blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/, then the lines as Tokenizer.blockquote reads them.
    private fun blockquote(src: Src): QuoteTok? {
        val n = blockquoteLength(src)
        if (n == 0) return null
        var lines = src.upTo(n).jsTrimEndNewlines().lines()
        var raw: Src? = null
        val tokens = mutableListOf<Tok>()
        while (lines.isNotEmpty()) {
            var inBlockquote = false
            val currentLines = mutableListOf<Src>()
            var i = 0
            while (i < lines.size) {
                if (blockquoteStart(lines[i])) {
                    currentLines += lines[i]
                    inBlockquote = true
                } else if (!inBlockquote) {
                    currentLines += lines[i]
                } else {
                    break
                }
                i++
            }
            lines = lines.subList(i, lines.size)
            val currentRaw = Src.join(currentLines, "\n")
            val currentText = withoutQuoteMarks(setextInQuote(currentRaw))
            raw = if (raw == null) currentRaw else Src.join(listOf(raw, currentRaw), "\n")
            val wasTop = top
            top = true
            blockTokens(currentText, tokens, true)
            top = wasTop
            if (lines.isEmpty()) break
            val last = tokens.lastOrNull()
            if (last is CodeTok) {
                break
            } else if (last is QuoteTok) {
                val newText = Src.join(listOf(last.raw) + lines, "\n")
                val newToken = blockquote(newText)!!
                tokens[tokens.lastIndex] = newToken
                raw = raw.upTo(raw.length - last.raw.length) + newToken.raw
                break
            } else if (last is ListTok) {
                val newText = Src.join(listOf(last.raw) + lines, "\n")
                // marked's own list tokenizer reads the list again; one numbered by letters it cannot, and the
                // web (0.2.7) reads it with the tokenizer of TipTap instead: the lines go into its last item.
                val newToken = list(newText) ?: orderedList(newText) ?: break
                tokens[tokens.lastIndex] = newToken
                raw = raw.upTo(raw.length - last.raw.length) + newToken.raw
                lines = newText.from(newToken.raw.length).lines()
                continue
            }
        }
        return QuoteTok(raw!!, tokens)
    }

    private fun blockquoteLength(src: Src): Int {
        var pos = 0
        while (pos < src.length) {
            var p = spacesUpTo(src, pos, 3)
            if (p >= src.length || src[p] != '>') break
            p++
            if (p < src.length && src[p] == ' ') p++
            // The blockquote of marked takes the paragraph of CommonMark, which a table does not end.
            if (p < src.length && src[p] != '\n') p = paragraphEnd(src, p, tables = false)
            pos = if (p < src.length) p + 1 else p
        }
        return pos
    }

    // The end of the paragraph `[^\n]+(?:\n(?!interrupters)[^\n]+)*` that starts at [at] (a non-empty line);
    // a table ends the paragraph of GFM only.
    private fun paragraphEnd(src: Src, at: Int, tables: Boolean): Int {
        var q = lineEnd(src, at)
        while (q < src.length && src[q] == '\n') {
            val next = q + 1
            if (interruptsParagraph(src, next, tables)) break
            val nextEnd = lineEnd(src, next)
            if (nextEnd == next) break
            q = nextEnd
        }
        return q
    }

    // paragraph: /^([^\n]+(?:\n(?!hr|heading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/ of GFM
    private fun paragraph(src: Src): Int = if (src.isNotEmpty() && src[0] != '\n') paragraphEnd(src, 0, tables = true) else 0

    // The lines that end a paragraph of GFM in marked, at the start of the line [at].
    private fun interruptsParagraph(src: Src, at: Int, tables: Boolean): Boolean {
        if (hrLength(src, at, 3, tabs = true) >= 0) return true
        // heading: / {0,3}#{1,6}(?:\s|$)/
        var p = spacesUpTo(src, at, 3)
        var q = p
        while (q < src.length && src[q] == '#') q++
        if (q - p in 1..6 && (q == src.length || isJsSpace(src[q]))) return true
        // blockquote: / {0,3}>/
        if (p < src.length && src[p] == '>') return true
        // fences: / {0,3}(?:`{3,}(?=[^`\n]*\n)|~{3,})[^\n]*\n/
        if (p < src.length && (src[p] == '`' || src[p] == '~')) {
            val fence = src[p]
            q = p
            while (q < src.length && src[q] == fence) q++
            val end = lineEnd(src, q)
            if (q - p >= 3 && end < src.length && (fence == '~' || (q until end).none { src[it] == '`' })) return true
        }
        // list: / {0,3}(?:[*+-]|1[.)])[ \t]/
        if (p < src.length) {
            val bulletEnd = when {
                src[p] in "*+-" -> p + 1
                src[p] == '1' && p + 1 < src.length && src[p + 1] in ".)" -> p + 2
                else -> -1
            }
            if (bulletEnd in 1 until src.length && (src[bulletEnd] == ' ' || src[bulletEnd] == '\t')) return true
        }
        // html: /<\/?(?:tag)(?: +|\n|\/?>)|<(?:script|pre|style|textarea|!--)/, at the very start, case as written
        if (htmlInterrupts(src, at)) return true
        if (tables && tableStarts(src, at)) return true
        // / +\n/
        q = at
        while (q < src.length && src[q] == ' ') q++
        return q > at && q < src.length && src[q] == '\n'
    }

    private fun htmlInterrupts(src: Src, at: Int): Boolean {
        if (at >= src.length || src[at] != '<') return false
        for (start in listOf("<script", "<pre", "<style", "<textarea", "<!--")) if (src.startsWith(start, at)) return true
        var p = at + 1
        if (p < src.length && src[p] == '/') p++
        var q = p
        while (q < src.length && (src[q] in 'a'..'z' || src[q] in '0'..'9')) q++
        if (src.subSequence(p, q).toString() !in BLOCK_TAGS) return false
        return q < src.length && (src[q] == ' ' || src[q] == '\n' || src[q] == '>' || src.startsWith("/>", q))
    }

    // The table of GFM at [at]: a header line, then a line of the delimiters, then a newline or the end.
    private fun tableStarts(src: Src, at: Int): Boolean {
        val header = tableHeaderEnd(src, at)
        if (header < 0) return false
        val delimiterEnd = lineEnd(src, header + 1)
        return delimiterRow(src.subSequence(header + 1, delimiterEnd).toString())
    }

    // The end of the header line ` *([^\n ].*)\n` at [at] (at its newline), or -1.
    private fun tableHeaderEnd(src: Src, at: Int): Int {
        var p = at
        while (p < src.length && src[p] == ' ') p++
        if (p >= src.length || src[p] == '\n') return -1
        val end = lineEnd(src, p)
        if ((p until end).any { isJsLineEnd(src[it]) }) return -1
        return if (end < src.length) end else -1
    }

    // ` {0,3}((?:\| *)?:?-+:? *(?:\| *:?-+:? *)*(?:\| *)?)` filling a line.
    private fun delimiterRow(line: String): Boolean {
        val p = line.takeWhile { it == ' ' }.length
        return p <= 3 && DELIMITER_ROW.matcher(line.substring(p)).matches()
    }

    private fun blockquoteStart(line: CharSequence): Boolean {
        val p = spacesUpTo(line, 0, 3)
        return p < line.length && line[p] == '>'
    }

    // blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g -> '\n    $1'
    private fun setextInQuote(text: Src): Src {
        val lines = text.lines()
        return Src.join(
            lines.mapIndexed { i, line ->
                if (i > 0 && setextLine(line)) Src.added("    ") + line.from(spacesUpTo(line, 0, 3)) else line
            },
            "\n",
        )
    }

    private fun setextLine(line: CharSequence): Boolean {
        val p = spacesUpTo(line, 0, 3)
        if (p >= line.length || (line[p] != '=' && line[p] != '-')) return false
        val mark = line[p]
        var q = p
        while (q < line.length && line[q] == mark) q++
        while (q < line.length && line[q] == ' ') q++
        return q == line.length
    }

    // blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm -> ''
    private fun withoutQuoteMarks(text: Src): Src = Src.join(
        text.lines().map { line ->
            val p = spacesUpTo(line, 0, 3)
            if (p < line.length && line[p] == '>') {
                val q = p + 1
                line.from(if (q < line.length && (line[q] == ' ' || line[q] == '\t')) q + 1 else q)
            } else {
                line
            }
        },
        "\n",
    )

    // list: Tokenizer.list of marked.
    fun list(start: Src): ListTok? {
        var src = start
        val first = listStart(src) ?: return null
        val bull = src.upTo(first).toString().jsTrim()
        val ordered = bull.length > 1
        val delimiter = bull.last()
        val items = mutableListOf<ItemTok>()
        var loose = false
        var endsWithBlankLine = false
        val listRaw = mutableListOf<Src>()
        while (src.isNotEmpty()) {
            var endEarly = false
            val bulletEnd = listItemBullet(src, ordered, delimiter)
            if (bulletEnd < 0) break
            if (hrLength(src, 0, 3, tabs = true) >= 0) break
            val firstLineEnd = lineEnd(src, bulletEnd)
            val itemLineEnd = if (firstLineEnd < src.length) firstLineEnd + 1 else firstLineEnd
            // The raw and the contents of the item grow line by line: they join at its end.
            val raw = mutableListOf(src.upTo(itemLineEnd))
            var line = src.subSequence(bulletEnd, firstLineEnd).expandTabs(bulletEnd)
            src = src.from(itemLineEnd)
            var nextLine = src.firstLine()
            var blankLine = line.isJsBlank()
            var indent: Int
            val contents = mutableListOf<Src>()
            if (blankLine) {
                indent = bulletEnd + 1
                contents += Src.added("")
            } else {
                indent = line.firstNonSpace()
                indent = if (indent > 4) 1 else indent
                contents += line.from(indent)
                indent += bulletEnd
            }
            if (blankLine && nextLine.all { it == ' ' || it == '\t' }) {
                raw += nextLine
                raw += Src.added("\n")
                src = src.from(nextLine.length + 1)
                endEarly = true
            }
            if (!endEarly) {
                val k = minOf(3, indent - 1)
                while (src.isNotEmpty()) {
                    val rawLine = src.firstLine()
                    nextLine = rawLine
                    val nextLineWithoutTabs = nextLine.tabsToSpaces()
                    if (fencesBegin(nextLine, k) || headingBegin(nextLine, k) || htmlBegin(nextLine, k) ||
                        blockquoteBegin(nextLine, k) || nextBullet(nextLine, k) || hrLength(nextLine, 0, k, tabs = false) >= 0
                    ) {
                        break
                    }
                    if (nextLineWithoutTabs.firstNonSpace() >= indent || nextLine.isJsBlank()) {
                        contents += nextLineWithoutTabs.from(indent)
                    } else {
                        if (blankLine) break
                        if (line.tabsToSpaces().firstNonSpace() >= 4) break
                        if (fencesBegin(line, k) || headingBegin(line, k) || hrLength(line, 0, k, tabs = false) >= 0) break
                        contents += nextLine
                    }
                    blankLine = nextLine.isJsBlank()
                    raw += rawLine
                    raw += Src.added("\n")
                    src = src.from(rawLine.length + 1)
                    line = nextLineWithoutTabs.from(indent)
                }
            }
            val itemRaw = Src.join(raw, "")
            if (!loose) {
                if (endsWithBlankLine) loose = true else if (endsWithBlank(itemRaw)) endsWithBlankLine = true
            }
            items += ItemTok(itemRaw, Src.join(contents, "\n"), mutableListOf())
            listRaw += itemRaw
        }
        if (items.isEmpty()) return null
        val lastItem = items.last()
        lastItem.raw = lastItem.raw.jsTrimEnd()
        lastItem.text = lastItem.text!!.jsTrimEnd()
        for (item in items) {
            top = false
            item.tokens.addAll(blockTokens(item.text!!, mutableListOf()))
            if (isTask(item.text!!)) {
                item.text = item.text!!.from(taskMark(item.text!!))
                val firstToken = item.tokens.firstOrNull()
                if (firstToken is TextBlockTok) {
                    firstToken.raw = firstToken.raw.from(taskMark(firstToken.raw))
                    firstToken.text = firstToken.text.substring(taskMark(firstToken.text))
                    for (entry in queue.asReversed()) {
                        if (isTask(entry.src)) {
                            entry.src.delete(0, taskMark(entry.src))
                            break
                        }
                    }
                }
                val bracket = (0..item.raw.length - 3).firstOrNull { item.raw[it] == '[' && item.raw[it + 1] in " xX" && item.raw[it + 2] == ']' }
                if (bracket != null) {
                    val checkbox = CheckboxTok(item.raw.subSequence(bracket, bracket + 3) + Src.added(" "))
                    if (loose) {
                        if (firstToken is TextBlockTok) {
                            firstToken.raw = checkbox.raw + firstToken.raw
                            firstToken.text = checkbox.raw.toString() + firstToken.text
                            firstToken.inline.add(0, CheckboxInl)
                        } else {
                            item.tokens.add(0, ParagraphTok(checkbox.raw, checkbox.raw.toString(), mutableListOf(CheckboxInl)))
                        }
                    } else {
                        item.tokens.add(0, checkbox)
                    }
                }
            }
            if (!loose) {
                loose = item.tokens.any { it is SpaceTok && hasTwoLineBreaks(it.raw) }
            }
        }
        if (loose) {
            for (item in items) {
                for (i in item.tokens.indices) {
                    val token = item.tokens[i]
                    if (token is TextTok) item.tokens[i] = ParagraphTok(token.raw, token.text, token.inline)
                }
            }
        }
        val startNumber = if (ordered) bull.dropLast(1).toInt() else 0
        return ListTok(Src.join(listRaw, "").jsTrimEnd(), ordered, startNumber, typeMarker = null, items)
    }

    // block.list: /^( {0,3}(?:[*+-]|\d{1,9}[.)]))([ \t][^\n]+?)?(?:\n|$)/ — the length of its first group, or null.
    private fun listStart(src: Src): Int? {
        val bulletEnd = bulletAt(src, spacesUpTo(src, 0, 3)) ?: return null
        if (bulletEnd == src.length || src[bulletEnd] == '\n') return bulletEnd
        if ((src[bulletEnd] == ' ' || src[bulletEnd] == '\t') && bulletEnd + 1 < src.length && src[bulletEnd + 1] != '\n') return bulletEnd
        return null
    }

    // The end of a bullet `[*+-]` or `\d{1,9}[.)]` at [at], or null.
    private fun bulletAt(src: CharSequence, at: Int): Int? {
        if (at >= src.length) return null
        if (src[at] in "*+-") return at + 1
        var q = at
        while (q < src.length && src[q] in '0'..'9') q++
        return if (q - at in 1..9 && q < src.length && src[q] in ".)") q + 1 else null
    }

    // itemRegex: /^( {0,3}bull)((?:[\t ][^\n]*)?(?:\n|$))/ — the end of its first group, or -1.
    private fun listItemBullet(src: Src, ordered: Boolean, delimiter: Char): Int {
        val p = spacesUpTo(src, 0, 3)
        val end: Int
        if (ordered) {
            var q = p
            while (q < src.length && src[q] in '0'..'9') q++
            if (q - p !in 1..9 || q >= src.length || src[q] != delimiter) return -1
            end = q + 1
        } else {
            if (p >= src.length || src[p] != delimiter) return -1
            end = p + 1
        }
        return if (end == src.length || src[end] == '\n' || src[end] == ' ' || src[end] == '\t') end else -1
    }

    private fun spacesAtMost(line: CharSequence, max: Int): Int? {
        var p = 0
        while (p < line.length && line[p] == ' ') p++
        return if (p <= max) p else null
    }

    // fencesBeginRegex: /^ {0,k}(?:```|~~~)/
    private fun fencesBegin(line: CharSequence, k: Int): Boolean {
        val p = spacesAtMost(line, k) ?: return false
        return line.startsWith("```", p) || line.startsWith("~~~", p)
    }

    // headingBeginRegex: /^ {0,k}#/
    private fun headingBegin(line: CharSequence, k: Int): Boolean {
        val p = spacesAtMost(line, k) ?: return false
        return p < line.length && line[p] == '#'
    }

    // htmlBeginRegex: /^ {0,k}<(?:[a-z].*>|!--)/i
    private fun htmlBegin(line: CharSequence, k: Int): Boolean {
        val p = spacesAtMost(line, k) ?: return false
        if (p >= line.length || line[p] != '<') return false
        if (line.startsWith("!--", p + 1)) return true
        if (p + 1 >= line.length || !line[p + 1].isAsciiLetter()) return false
        var q = p + 2
        while (q < line.length && !isJsLineEnd(line[q])) {
            if (line[q] == '>') return true
            q++
        }
        return false
    }

    // blockquoteBeginRegex: /^ {0,k}>/
    private fun blockquoteBegin(line: CharSequence, k: Int): Boolean {
        val p = spacesAtMost(line, k) ?: return false
        return p < line.length && line[p] == '>'
    }

    // nextBulletRegex: /^ {0,k}(?:[*+-]|\d{1,9}[.)])((?:[ \t][^\n]*)?(?:\n|$))/
    private fun nextBullet(line: CharSequence, k: Int): Boolean {
        val p = spacesAtMost(line, k) ?: return false
        val end = bulletAt(line, p) ?: return false
        return end == line.length || line[end] == ' ' || line[end] == '\t'
    }

    // doubleBlankLine: /\n[ \t]*\n[ \t]*$/
    private fun endsWithBlank(raw: Src): Boolean {
        var i = raw.length
        while (i > 0 && (raw[i - 1] == ' ' || raw[i - 1] == '\t')) i--
        if (i == 0 || raw[i - 1] != '\n') return false
        i--
        while (i > 0 && (raw[i - 1] == ' ' || raw[i - 1] == '\t')) i--
        return i > 0 && raw[i - 1] == '\n'
    }

    // anyLine: /\n.*\n/
    private fun hasTwoLineBreaks(raw: Src): Boolean {
        val first = raw.indexOf('\n')
        if (first < 0) return false
        var i = first + 1
        while (i < raw.length) {
            if (raw[i] == '\n') return true
            if (isJsLineEnd(raw[i])) return false
            i++
        }
        return false
    }

    // listReplaceTask: /^\[[ xX]\] +/ — the length of the mark and its spaces, or 0.
    private fun taskMark(text: CharSequence): Int {
        if (text.length < 4 || text[0] != '[' || text[1] !in " xX" || text[2] != ']' || text[3] != ' ') return 0
        var n = 4
        while (n < text.length && text[n] == ' ') n++
        return n
    }

    // listIsTask: /^\[[ xX]\] +\S/
    private fun isTask(text: CharSequence): Boolean {
        val n = taskMark(text)
        return n > 0 && n < text.length && !isJsSpace(text[n])
    }

    // html: the block html of marked, its seven kinds.
    private fun html(src: Src): HtmlTok? {
        val p = spacesUpTo(src, 0, 3)
        if (p >= src.length || src[p] != '<') return null
        val end = rawBlockEnd(src, p) ?: commentEnd(src, p) ?: instructionEnd(src, p) ?: declarationEnd(src, p) ?: cdataEnd(src, p)
            ?: blockTagEnd(src, p) ?: lineTagEnd(src, p) ?: return null
        return HtmlTok(src.upTo(end))
    }

    // (1) <(script|pre|style|textarea)[\s>][\s\S]*?(?:</\1>[^\n]*\n+|$)
    private fun rawBlockEnd(src: Src, p: Int): Int? {
        val name = listOf("script", "pre", "style", "textarea").firstOrNull { src.startsWithIgnoreCase(it, p + 1) } ?: return null
        val after = p + 1 + name.length
        if (after >= src.length || !(isJsSpace(src[after]) || src[after] == '>')) return null
        var q = after + 1
        while (q < src.length) {
            if (src.startsWith("</", q) && src.startsWithIgnoreCase(name, q + 2) && q + 2 + name.length < src.length && src[q + 2 + name.length] == '>') {
                val end = lineEnd(src, q + 3 + name.length)
                if (end < src.length) return newlinesFrom(src, end)
            }
            q++
        }
        return src.length
    }

    // (2) <!--(?:-?>|[\s\S]*?(?:-->|$))[^\n]*(\n+|$)
    private fun commentEnd(src: Src, p: Int): Int? {
        if (!src.startsWith("<!--", p)) return null
        val q = p + 4
        val close = when {
            src.startsWith(">", q) -> q + 1
            src.startsWith("->", q) -> q + 2
            else -> src.indexOf("-->", q).let { if (it < 0) src.length else it + 3 }
        }
        return newlinesFrom(src, lineEnd(src, close))
    }

    // (3) <\?[\s\S]*?(?:\?>\n*|$)
    private fun instructionEnd(src: Src, p: Int): Int? {
        if (!src.startsWith("<?", p)) return null
        val close = src.indexOf("?>", p + 2)
        return if (close < 0) src.length else newlinesFrom(src, close + 2)
    }

    // (4) <![A-Z][\s\S]*?(?:>\n*|$) — case-insensitive
    private fun declarationEnd(src: Src, p: Int): Int? {
        if (!src.startsWith("<!", p) || p + 2 >= src.length || !src[p + 2].isAsciiLetter()) return null
        val close = src.indexOf('>', p + 3)
        return if (close < 0) src.length else newlinesFrom(src, close + 1)
    }

    // (5) <!\[CDATA\[[\s\S]*?(?:\]\]>\n*|$) — case-insensitive
    private fun cdataEnd(src: Src, p: Int): Int? {
        if (!src.startsWithIgnoreCase("<![CDATA[", p)) return null
        val close = src.indexOf("]]>", p + 9)
        return if (close < 0) src.length else newlinesFrom(src, close + 3)
    }

    // (6) </?(tag)(?: +|\n|/?>)[\s\S]*?(?:(?:\n[ \t]*)+\n|$) — case-insensitive
    private fun blockTagEnd(src: Src, p: Int): Int? {
        var q = p + 1
        if (q < src.length && src[q] == '/') q++
        var r = q
        while (r < src.length && (src[r].isAsciiLetter() || src[r] in '0'..'9')) r++
        if (src.subSequence(q, r).toString().lowercase() !in BLOCK_TAGS) return null
        if (!(r < src.length && (src[r] == ' ' || src[r] == '\n' || src[r] == '>' || src.startsWith("/>", r)))) return null
        val after = when (src[r]) {
            ' ' -> {
                var q2 = r
                while (q2 < src.length && src[q2] == ' ') q2++
                q2
            }
            '\n', '>' -> r + 1
            else -> r + 2
        }
        return blankLineEnd(src, after)
    }

    // (7) a whole line of one open or closing tag, not of script, pre, style or textarea — case-insensitive
    private fun lineTagEnd(src: Src, p: Int): Int? {
        var q = p + 1
        val closing = q < src.length && src[q] == '/'
        if (closing) q++
        for (name in listOf("script", "pre", "style", "textarea")) if (src.startsWithIgnoreCase(name, q)) return null
        if (q >= src.length || !src[q].isAsciiLetter()) return null
        q++
        while (q < src.length && (src[q].isAsciiLetter() || src[q] in '0'..'9' || src[q] == '_' || src[q] == '-')) q++
        if (closing) {
            while (q < src.length && isJsSpace(src[q])) q++
        } else {
            q = attributesEnd(src, q) ?: return null
        }
        if (q >= src.length || src[q] != '>') return null
        q++
        var r = q
        while (r < src.length && (src[r] == ' ' || src[r] == '\t')) r++
        if (r < src.length && src[r] != '\n') return null
        return blankLineEnd(src, q)
    }

    // (?:attribute)*? */? — attribute: / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/;
    // the end before ">", or null.
    private fun attributesEnd(src: Src, start: Int): Int? {
        var q = start
        while (true) {
            var r = q
            while (r < src.length && src[r] == ' ') r++
            if (r < src.length && src[r] == '/') r++
            if (r < src.length && src[r] == '>') return r
            r = q
            while (r < src.length && src[r] == ' ') r++
            if (r == q || r >= src.length || !(src[r].isAsciiLetter() || src[r] == ':' || src[r] == '_')) return null
            r++
            while (r < src.length && (src[r].isAsciiLetter() || src[r] in '0'..'9' || src[r] in "_.:-")) r++
            var v = r
            while (v < src.length && src[v] == ' ') v++
            if (v < src.length && src[v] == '=') {
                v++
                while (v < src.length && src[v] == ' ') v++
                val valueEnd = when {
                    v < src.length && (src[v] == '"' || src[v] == '\'') -> {
                        val quote = src[v]
                        var w = v + 1
                        while (w < src.length && src[w] != quote && src[w] != '\n') w++
                        if (w < src.length && src[w] == quote) w + 1 else -1
                    }
                    else -> {
                        var w = v
                        while (w < src.length && !isJsSpace(src[w]) && src[w] !in "\"'=<>`") w++
                        if (w > v) w else -1
                    }
                }
                if (valueEnd > 0) r = valueEnd
            }
            q = r
        }
    }

    // [\s\S]*?(?:(?:\n[ \t]*)+\n|$) from [at]: through the first blank line, or to the end.
    private fun blankLineEnd(src: Src, at: Int): Int {
        var q = at
        while (q < src.length) {
            if (src[q] == '\n') {
                var r = q + 1
                var last = -1
                while (true) {
                    while (r < src.length && (src[r] == ' ' || src[r] == '\t')) r++
                    if (r < src.length && src[r] == '\n') {
                        last = r
                        r++
                    } else {
                        break
                    }
                }
                if (last >= 0) return last + 1
            }
            q++
        }
        return src.length
    }

    // The end of the newlines (\n+ or \n*) that follow [at].
    private fun newlinesFrom(src: Src, at: Int): Int {
        var q = at
        while (q < src.length && src[q] == '\n') q++
        return q
    }

    // def: /^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/
    private fun def(src: Src): Triple<DefTok, String, LinkDef>? {
        val p = spacesUpTo(src, 0, 3)
        if (p >= src.length || src[p] != '[') return null
        val labelEnd = blockLabelEnd(src, p + 1)
        if (labelEnd < 0 || !src.startsWith("]:", labelEnd)) return null
        val label = src.subSequence(p + 1, labelEnd).toString()
        var q = labelEnd + 2
        while (q < src.length && src[q] == ' ') q++
        if (q < src.length && src[q] == '\n') {
            q++
            while (q < src.length && (src[q] == ' ' || src[q] == '\t')) q++
        }
        // the destination, then the title or none, then the end of the line
        val ends = mutableListOf<Int>()
        if (q < src.length && src[q] != '<' && !isJsSpace(src[q])) {
            var r = q + 1
            while (r < src.length && !isJsSpace(src[r])) r++
            ends += r
        } else if (q < src.length && src[q] == '<') {
            var r = q + 1
            while (r < src.length && !isJsLineEnd(src[r])) {
                if (src[r] == '>') ends += r + 1
                r++
            }
        }
        for (destinationEnd in ends) {
            var title: String? = null
            var end = -1
            for (titleEnd in titleEnds(src, destinationEnd)) {
                val rest = lineRestEnd(src, titleEnd.second) ?: continue
                title = src.subSequence(titleEnd.first, titleEnd.second).toString()
                end = rest
                break
            }
            if (end < 0) end = lineRestEnd(src, destinationEnd) ?: continue
            val destination = src.subSequence(q, destinationEnd).toString()
            val href = unescapePunctuation(if (destination.startsWith('<') && destination.endsWith('>')) destination.substring(1, destination.length - 1) else destination)
            val tag = label.lowercase().replace(JS_SPACES_RUN, " ")
            val titleText = title?.let { unescapePunctuation(it.substring(1, it.length - 1)) }
            return Triple(DefTok(src.upTo(end)), tag, LinkDef(href, titleText))
        }
        return null
    }

    // The label (?!\s*\])(?:\\[\s\S]|[^\[\]\\])+ from [at] to its "]" (the index of it), or -1.
    private fun blockLabelEnd(src: CharSequence, at: Int): Int {
        var q = at
        while (q < src.length) {
            when (src[q]) {
                '\\' -> q += 2
                '[' -> return -1
                ']' -> return if (q > at && !src.subSequence(at, q).isJsBlank()) q else -1
                else -> q++
            }
        }
        return -1
    }

    // (?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? after a destination that ends at [at]: the start and the
    // end of each title, in the order the regular expression tries them.
    private fun titleEnds(src: Src, at: Int): List<Pair<Int, Int>> {
        var q = at
        while (q < src.length && src[q] == ' ') q++
        val start = when {
            q < src.length && src[q] == '\n' -> {
                var r = q + 1
                while (r < src.length && (src[r] == ' ' || src[r] == '\t')) r++
                r
            }
            q > at -> q
            else -> return emptyList()
        }
        if (start >= src.length) return emptyList()
        return when (src[start]) {
            // "(?:\\"?|[^"\\])*": up to the first quote no backslash stands before, then back over the escaped ones
            '"' -> {
                val escaped = mutableListOf<Int>()
                var r = start + 1
                var closing = -1
                while (r < src.length) {
                    if (src[r] == '"') {
                        if (src[r - 1] == '\\' && r - 1 > start) {
                            escaped += r
                        } else {
                            closing = r
                            break
                        }
                    }
                    r++
                }
                (listOfNotNull(closing.takeIf { it >= 0 }) + escaped.reversed()).map { start to it + 1 }
            }
            // '[^'\n]*(?:\n[^'\n]+)*\n?': up to the first quote, with no empty line before it but the last
            '\'' -> {
                val closing = src.indexOf('\'', start + 1)
                if (closing < 0) return emptyList()
                val parts = src.subSequence(start + 1, closing).toString().split('\n')
                val inner = parts.subList(1, maxOf(1, parts.size - 1))
                val ok = inner.all { it.isNotEmpty() }
                if (ok) listOf(start to closing + 1) else emptyList()
            }
            // \([^()]*\)
            '(' -> {
                var r = start + 1
                while (r < src.length && src[r] != ')' && src[r] != '(') r++
                if (r < src.length && src[r] == ')') listOf(start to r + 1) else emptyList()
            }
            else -> emptyList()
        }
    }

    //  *(?:\n+|$) at [at]: the end of the match, or null.
    private fun lineRestEnd(src: Src, at: Int): Int? {
        var q = at
        while (q < src.length && src[q] == ' ') q++
        if (q == src.length) return q
        if (src[q] != '\n') return null
        return newlinesFrom(src, q)
    }

    // table: the table of GFM, with the checks of Tokenizer.table.
    private fun table(src: Src): TableTok? {
        val header = tableHeaderEnd(src, 0)
        if (header < 0) return null
        val delimiterEnd = lineEnd(src, header + 1)
        val delimiterLine = src.subSequence(header + 1, delimiterEnd).toString()
        if (!delimiterRow(delimiterLine)) return null
        var end = delimiterEnd
        if (end < src.length) {
            // rows: lines that start no other block, each to its newline or the end
            var q = end + 1
            var rowsEnd = q
            while (q < src.length) {
                if (tableRowEnds(src, q)) break
                val e = lineEnd(src, q)
                if ((q until e).any { isJsLineEnd(src[it]) }) break
                rowsEnd = if (e < src.length) e + 1 else e
                q = rowsEnd
                if (e == src.length) break
            }
            end = newlinesFrom(src, rowsEnd)
        }
        val delimiter = delimiterLine.trimStart(' ')
        if (':' !in delimiter && '|' !in delimiter) return null
        val headers = cellCount(src.upTo(header).toString().trimStart(' '))
        val aligns = delimiter.replace(TABLE_ALIGN_CHARS, "").split('|').size
        if (headers != aligns) return null
        return TableTok(src.upTo(end))
    }

    // The lines that end the rows of a table: (?! *\n|hr|heading|blockquote|code|fences|list|html).
    private fun tableRowEnds(src: Src, at: Int): Boolean {
        var q = at
        while (q < src.length && src[q] == ' ') q++
        if (q < src.length && src[q] == '\n') return true
        if (hrLength(src, at, 3, tabs = true) >= 0) return true
        val p = spacesUpTo(src, at, 3)
        var r = p
        while (r < src.length && src[r] == '#') r++
        if (r - p in 1..6 && (r == src.length || isJsSpace(src[r]))) return true
        if (p < src.length && src[p] == '>') return true
        val content = codeIndent(src, at)
        if (content in 0 until src.length && src[content] != '\n') return true
        if (p < src.length && (src[p] == '`' || src[p] == '~')) {
            val fence = src[p]
            r = p
            while (r < src.length && src[r] == fence) r++
            val end = lineEnd(src, r)
            if (r - p >= 3 && end < src.length && (fence == '~' || (r until end).none { src[it] == '`' })) return true
        }
        if (p < src.length) {
            val bulletEnd = when {
                src[p] in "*+-" -> p + 1
                src[p] == '1' && p + 1 < src.length && src[p + 1] in ".)" -> p + 2
                else -> -1
            }
            if (bulletEnd in 1 until src.length && (src[bulletEnd] == ' ' || src[bulletEnd] == '\t')) return true
        }
        return htmlInterrupts(src, at)
    }

    // The number of cells splitCells of marked finds in a header row.
    private fun cellCount(row: String): Int {
        val spaced = StringBuilder()
        for (i in row.indices) {
            if (row[i] == '|') {
                var slashes = 0
                var k = i - 1
                while (k >= 0 && row[k] == '\\') {
                    slashes++
                    k--
                }
                spaced.append(if (slashes % 2 == 1) "|" else " |")
            } else {
                spaced.append(row[i])
            }
        }
        val cells = spaced.toString().split(" |").toMutableList()
        if (cells.isNotEmpty() && cells.first().jsTrim().isEmpty()) cells.removeAt(0)
        if (cells.isNotEmpty() && cells.last().jsTrim().isEmpty()) cells.removeAt(cells.lastIndex)
        return cells.size
    }

    // lheading of GFM: a setext heading, its text not starting nor going on into another block.
    private fun lheading(src: Src): HeadingTok? {
        if (setextInterrupts(src, 0)) return null
        var pos = 0
        while (true) {
            if (pos >= 1 && pos < src.length && src[pos] == '\n') {
                val underline = setextUnderline(src, pos + 1)
                if (underline != null) {
                    val text = src.upTo(pos).toString().jsTrim()
                    return HeadingTok(src.upTo(underline.second), if (underline.first == '=') 1 else 2, inline(text))
                }
            }
            if (pos >= src.length) return null
            val c = src[pos]
            if (c == '\n') {
                if (nextLineBlank(src, pos + 1) || setextInterrupts(src, pos + 1)) return null
            } else if (isJsLineEnd(c)) {
                return null
            }
            pos++
        }
    }

    // \n {0,3}(=+|-+) *(?:\n+|$) after the text, from [at]: the mark and the end, or null.
    private fun setextUnderline(src: Src, at: Int): Pair<Char, Int>? {
        val p = spacesUpTo(src, at, 3)
        if (p >= src.length || (src[p] != '=' && src[p] != '-')) return null
        val mark = src[p]
        var q = p
        while (q < src.length && src[q] == mark) q++
        while (q < src.length && src[q] == ' ') q++
        if (q < src.length && src[q] != '\n') return null
        return mark to newlinesFrom(src, q)
    }

    // \s*?\n: the line at [at] holds only white space before its newline.
    private fun nextLineBlank(src: Src, at: Int): Boolean {
        var q = at
        while (q < src.length && isJsSpace(src[q]) && src[q] != '\n') q++
        return q < src.length && src[q] == '\n'
    }

    // The starts that a setext heading's text may not have: bull |blockCode|fences|blockquote|heading|html|table.
    private fun setextInterrupts(src: Src, at: Int): Boolean {
        val p = spacesUpTo(src, at, 3)
        val bulletEnd = bulletAt(src, p)
        if (bulletEnd != null && bulletEnd < src.length && src[bulletEnd] == ' ') return true
        if (codeIndent(src, at) >= 0) return true
        if (p < src.length && (src.startsWith("```", p) || src.startsWith("~~~", p))) return true
        if (p < src.length && (src[p] == '>' || src[p] == '#')) return true
        if (p < src.length && src[p] == '<') {
            var q = p + 1
            while (q < src.length && src[q] != '\n' && src[q] != '>') q++
            if (q > p + 1 && q + 1 < src.length && src[q] == '>' && src[q + 1] == '\n') return true
        }
        // table: / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/
        val end = lineEnd(src, p)
        return end < src.length && (p until end).all { src[it] in ":- |" } && (p until end).any { src[it] == '|' }
    }

    // ---------- TipTap's task list (task-list.ts, parseIndentedBlocks of @tiptap/core) ----------

    private fun taskList(src: Src): TaskListTok? {
        val result = indentedTaskItems(src) ?: return null
        return TaskListTok(result.second, result.first)
    }

    // parseIndentedBlocks with the item pattern /^(\s*)([-+*])\s+\[([ xX])\]\s+(.*)$/: the items and their raw.
    private fun indentedTaskItems(src: Src): Pair<List<TaskItemTok>, Src>? {
        // Most blocks are no task list: the first line that is not blank tells, before the lines are cut.
        var lineStart = 0
        while (true) {
            val end = lineEnd(src, lineStart)
            val line = src.subSequence(lineStart, end)
            if (!line.isJsBlank()) {
                if (taskLine(line) == null) return null
                break
            }
            if (end >= src.length) return null
            lineStart = end + 1
        }
        val lines = src.lines()
        val items = mutableListOf<TaskItemTok>()
        val raw = mutableListOf<Src>()
        var i = 0
        while (i < lines.size) {
            val line = lines[i]
            val match = taskLine(line)
            if (match == null) {
                if (items.isNotEmpty()) break
                if (line.isJsBlank()) {
                    i++
                    raw += line
                    continue
                }
                return null
            }
            raw += line
            val nested = mutableListOf<Src>()
            i++
            while (i < lines.size) {
                val next = lines[i]
                if (next.isJsBlank()) {
                    val following = (i + 1 until lines.size).firstOrNull { !lines[it].isJsBlank() } ?: break
                    if (lines[following].jsIndent() > match.indent) {
                        nested += next
                        raw += next
                        i++
                        continue
                    }
                    break
                }
                if (next.jsIndent() > match.indent) {
                    nested += next
                    raw += next
                    i++
                } else {
                    break
                }
            }
            var nestedTokens: List<Tok>? = null
            if (nested.isNotEmpty()) {
                val dedented = Src.join(nested.map { it.from(match.indent + 2) }, "\n")
                if (!dedented.isJsBlank()) nestedTokens = taskListContent(dedented)
            }
            items += TaskItemTok(match.checked, line.origin(match.bracket + 1), match.content.toString(), inlineTokens(match.content.toString()), nestedTokens)
        }
        if (items.isEmpty()) return null
        return items to Src.join(raw.map { it + Src.added("\n") }, "")
    }

    // parseTaskListContent of task-list.ts: nested task items, or the blocks of marked.
    private fun taskListContent(content: Src): List<Tok> {
        val nested = indentedTaskItems(content) ?: return blockTokens(content, mutableListOf())
        val token = TaskListTok(nested.second, nested.first)
        val remainder = content.from(nested.second.length)
        return if (!remainder.isJsBlank()) listOf(token) + blockTokens(remainder, mutableListOf()) else listOf(token)
    }

    // The start function of TipTap's task list on src.slice(1): /^\s*[-+*]\s+\[([ xX])\]\s+/.
    private fun taskListStartsAfterFirst(src: Src): Boolean {
        if (src.length < 2) return false
        return taskStartAt(src, 1) >= 0
    }

    // ---------- TipTap's ordered list (ordered-list.ts and its utils) ----------

    private class OrderedItem(val indent: Int, val number: Int, val type: String?, val contentLines: List<Src>, val raw: Src)

    private fun orderedList(src: Src): ListTok? {
        if (orderedLine(src.firstLine()) == null) return null
        val lines = src.lines()
        val listItems = mutableListOf<OrderedItem>()
        var current = 0
        var consumed = 0
        while (current < lines.size) {
            val line = lines[current]
            val match = orderedLine(line) ?: break
            val (indent, marker, content) = match
            val number = marker.toIntOrNull()
            val type = if (number == null) markerType(marker) else null
            val itemNumber = number ?: markerStart(marker)
            val contentLines = mutableListOf(content)
            val itemLines = mutableListOf(line)
            var next = current + 1
            var sawBlankLine = false
            while (next < lines.size) {
                val nextLine = lines[next]
                if (orderedLine(nextLine) != null) break
                if (nextLine.isJsBlank()) {
                    itemLines += nextLine
                    contentLines += Src.added("")
                    sawBlankLine = true
                    next++
                } else if (isJsSpace(nextLine[0])) {
                    val leading = nextLine.jsIndent()
                    val contentIndent = indent + marker.length + 1
                    itemLines += nextLine
                    contentLines += nextLine.from(minOf(leading, contentIndent))
                    next++
                } else {
                    if (sawBlankLine || interruptsLazyContinuation(nextLine)) break
                    itemLines += nextLine
                    contentLines += nextLine
                    next++
                }
            }
            listItems += OrderedItem(indent, itemNumber, type, contentLines, Src.join(itemLines, "\n"))
            consumed = next
            current = next
        }
        if (listItems.isEmpty()) return null
        val items = nestedOrderedItems(listItems, listItems[0].indent)
        if (items.isEmpty()) return null
        val first = listItems[0]
        return ListTok(Src.join(lines.subList(0, consumed), "\n"), ordered = true, start = first.number, typeMarker = first.type, items)
    }

    // buildNestedStructure: the items of [baseIndent], each with the deeper items after it as a nested list.
    private fun nestedOrderedItems(items: List<OrderedItem>, baseIndent: Int): List<ItemTok> {
        val result = mutableListOf<ItemTok>()
        var current = 0
        while (current < items.size) {
            val item = items[current]
            if (item.indent != baseIndent) {
                current++
                continue
            }
            val (paragraphLines, blockLines) = splitItemContent(item.contentLines)
            val mainText = Src.join(paragraphLines, "\n").jsTrim().toString()
            val tokens = mutableListOf<Tok>()
            if (mainText.isNotEmpty()) tokens += ParagraphTok(Src.added(mainText), mainText, inlineTokens(mainText).toMutableList())
            val additional = Src.join(blockLines, "\n").jsTrim()
            if (additional.isNotEmpty()) tokens += blockTokens(additional, mutableListOf())
            var lookAhead = current + 1
            val nestedItems = mutableListOf<OrderedItem>()
            while (lookAhead < items.size && items[lookAhead].indent > baseIndent) nestedItems += items[lookAhead++]
            if (nestedItems.isNotEmpty()) {
                tokens += ListTok(
                    Src.join(nestedItems.map { it.raw }, "\n"),
                    ordered = true,
                    start = nestedItems[0].number,
                    typeMarker = nestedItems[0].type,
                    items = nestedOrderedItems(nestedItems, nestedItems.minOf { it.indent }),
                )
            }
            result += ItemTok(item.raw, null, tokens)
            current = lookAhead
        }
        return result
    }

    // splitItemContent: the lines of the item's first paragraph, and the rest after a blank line or a block.
    private fun splitItemContent(lines: List<Src>): Pair<List<Src>, List<Src>> {
        val paragraph = mutableListOf<Src>()
        val blocks = mutableListOf<Src>()
        var reached = false
        for (line in lines) {
            if (reached) {
                blocks += line
            } else if (line.isJsBlank()) {
                reached = true
                blocks += line
            } else if (paragraph.isNotEmpty() && isBlockContentLine(line)) {
                reached = true
                blocks += line
            } else {
                paragraph += line
            }
        }
        return paragraph to blocks
    }
}

// ---------- the line patterns of TipTap ----------

internal class TaskLine(val indent: Int, val bracket: Int, val checked: Boolean, val content: Src)

// /^(\s*)([-+*])\s+\[([ xX])\]\s+(.*)$/ on one line.
internal fun taskLine(line: Src): TaskLine? {
    val indent = line.jsIndent()
    val bracket = taskBracket(line, indent) ?: return null
    var q = bracket + 3
    val spaceStart = q
    while (q < line.length && isJsSpace(line[q])) q++
    if (q == spaceStart) return null
    if ((q until line.length).any { isJsLineEnd(line[it]) }) return null
    return TaskLine(indent, bracket, line[bracket + 1] != ' ', line.from(q))
}

// [-+*]\s+\[[ xX]\] at [at]: the index of its "[", or null.
private fun taskBracket(text: CharSequence, at: Int): Int? {
    if (at >= text.length || text[at] !in "-+*") return null
    var q = at + 1
    val spaceStart = q
    while (q < text.length && isJsSpace(text[q])) q++
    if (q == spaceStart || q + 2 >= text.length) return null
    return if (text[q] == '[' && text[q + 1] in " xX" && text[q + 2] == ']') q else null
}

// /^\s*[-+*]\s+\[([ xX])\]\s+/ at [at]: the index of the "[", or -1 (the start of a task, which may go on to the next line).
internal fun taskStartAt(text: CharSequence, at: Int): Int {
    var p = at
    while (p < text.length && isJsSpace(text[p])) p++
    val bracket = taskBracket(text, p) ?: return -1
    return if (bracket + 3 < text.length && isJsSpace(text[bracket + 3])) bracket else -1
}

private val ROMAN_NUMERALS = listOf(
    1000 to "m", 900 to "cm", 500 to "d", 400 to "cd", 100 to "c", 90 to "xc",
    50 to "l", 40 to "xl", 10 to "x", 9 to "ix", 5 to "v", 4 to "iv", 1 to "i",
)

// ORDERED_LIST_ITEM_REGEX: /^(\s*)(\d+|[ivxlcdmIVXLCDM]+|[a-zA-Z]{1,2})([.)])\s+(.*)$/ — indent, marker, content.
private fun orderedLine(line: Src): Triple<Int, String, Src>? {
    val p = line.jsIndent()
    if (p >= line.length) return null
    val markerEnd = orderedMarkerEnd(line, p) ?: return null
    var q = markerEnd + 1
    val spaceStart = q
    while (q < line.length && isJsSpace(line[q])) q++
    if (q == spaceStart) return null
    if ((q until line.length).any { isJsLineEnd(line[it]) }) return null
    return Triple(p, line.subSequence(p, markerEnd).toString(), line.from(q))
}

// The end of the marker at [p] when a "." or ")" follows it, trying digits, then roman numerals, then one or two letters.
private fun orderedMarkerEnd(text: CharSequence, p: Int): Int? {
    fun closedAt(end: Int) = end < text.length && text[end] in ".)"
    var q = p
    while (q < text.length && text[q] in '0'..'9') q++
    if (q > p) return if (closedAt(q)) q else null
    q = p
    while (q < text.length && text[q] in "ivxlcdmIVXLCDM") q++
    if (q > p && closedAt(q)) return q
    if (p + 1 < text.length && text[p].isAsciiLetter() && text[p + 1].isAsciiLetter() && closedAt(p + 2)) return p + 2
    if (text[p].isAsciiLetter() && closedAt(p + 1)) return p + 1
    return null
}

private fun fromRoman(roman: String): Int {
    val lower = roman.lowercase()
    var index = 0
    var result = 0
    while (index < lower.length) {
        val numeral = ROMAN_NUMERALS.firstOrNull { lower.startsWith(it.second, index) } ?: return 0
        result += numeral.first
        index += numeral.second.length
    }
    return result
}

private fun toRoman(number: Int): String {
    var remaining = number
    val result = StringBuilder()
    for ((value, numeral) in ROMAN_NUMERALS) {
        while (remaining >= value) {
            result.append(numeral)
            remaining -= value
        }
    }
    return result.toString()
}

private fun isValidRoman(marker: String): Boolean {
    if (marker.isEmpty() || marker.any { it !in "ivxlcdmIVXLCDM" }) return false
    val value = fromRoman(marker)
    if (value <= 0) return false
    return (if (marker == marker.lowercase()) toRoman(value) else toRoman(value).uppercase()) == marker
}

// detectMarkerType: "i" or "I" for roman numerals, "a" or "A" for letters, null otherwise.
private fun markerType(marker: String): String? = when {
    marker.isEmpty() || marker.all { it in '0'..'9' } -> null
    isValidRoman(marker) -> if (marker == marker.lowercase()) "i" else "I"
    marker.length <= 2 && marker.all { it in 'a'..'z' } -> "a"
    marker.length <= 2 && marker.all { it in 'A'..'Z' } -> "A"
    else -> null
}

// markerToStart: the number a marker stands for.
private fun markerStart(marker: String): Int = when (markerType(marker)) {
    "i", "I" -> fromRoman(marker)
    "a", "A" -> {
        val lower = marker.lowercase()
        val value = when (lower.length) {
            1 -> lower[0] - 'a' + 1
            2 -> (lower[0] - 'a' + 1) * 26 + (lower[1] - 'a') + 1
            else -> 0
        }
        if (value > 0) value else 1
    }
    else -> 1
}

// PARAGRAPH_INTERRUPTERS of the ordered list's utils, on a line as written.
private fun interruptsLazyContinuation(line: CharSequence): Boolean {
    var q = 0
    while (q < line.length && line[q] == '#') q++
    if (q in 1..6 && (q == line.length || isJsSpace(line[q]))) return true
    if (line.isNotEmpty() && line[0] in "-+*" && line.length > 1 && isJsSpace(line[1])) return true
    if (line.startsWith("```") || line.startsWith("~~~") || line.startsWith("$$")) return true
    return thematicBreak(line)
}

// /^(?:(?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})$/
private fun thematicBreak(line: CharSequence): Boolean {
    if (line.isEmpty() || line[0] !in "-_*") return false
    val mark = line[0]
    var count = 0
    for (c in line) {
        if (c == mark) count++ else if (c != ' ' && c != '\t') return false
    }
    return count >= 3
}

// isBlockContentLine of the ordered list's utils.
private fun isBlockContentLine(line: Src): Boolean {
    val trimmed = line.jsTrimStart()
    if (trimmed.isNotEmpty() && trimmed[0] in "-+*" && trimmed.length > 1 && isJsSpace(trimmed[1])) return true
    if (orderedLine(trimmed) != null) return true
    var q = 0
    while (q < trimmed.length && trimmed[q] == '#') q++
    if (q in 1..6 && (q == trimmed.length || isJsSpace(trimmed[q]))) return true
    if (thematicBreak(trimmed) && !trimmed.startsWith("-")) return true
    if (trimmed.startsWith(">")) return true
    return trimmed.startsWith("```") || trimmed.startsWith("~~~") || trimmed.startsWith("$$")
}

// ---------- helpers ----------

// The index after up to [max] spaces at [at].
private fun spacesUpTo(text: CharSequence, at: Int, max: Int): Int {
    var p = at
    while (p < text.length && p - at < max && text[p] == ' ') p++
    return p
}

// The index of the newline that ends the line at [at], or the end.
private fun lineEnd(text: CharSequence, at: Int): Int {
    var q = at
    while (q < text.length && text[q] != '\n') q++
    return q
}

private fun Char.isAsciiLetter(): Boolean = this in 'a'..'z' || this in 'A'..'Z'

private fun CharSequence.startsWithIgnoreCase(prefix: String, at: Int): Boolean =
    at + prefix.length <= length && (prefix.indices).all { this[at + it].lowercaseChar() == prefix[it].lowercaseChar() && this[at + it].code < 128 }

// rtrim(cap[0], '\n') of the blockquote.
private fun Src.jsTrimEndNewlines(): Src {
    var end = length
    while (end > 0 && this[end - 1] == '\n') end--
    return upTo(end)
}

/** \r\n and \r as \n (marked's lex): the newline stands for the \r. */
internal fun withoutCarriageReturns(src: Src): Src {
    if ('\r' !in src) return src
    val parts = mutableListOf<Src>()
    var start = 0
    var i = 0
    while (i < src.length) {
        if (src[i] == '\r') {
            parts += src.subSequence(start, i)
            parts += Src.withOrigin("\n", src.origin(i))
            i += if (i + 1 < src.length && src[i + 1] == '\n') 2 else 1
            start = i
        } else {
            i++
        }
    }
    parts += src.from(start)
    return Src.join(parts, "")
}

private val BLOCK_TAGS = setOf(
    "address", "article", "aside", "base", "basefont", "blockquote", "body", "caption", "center", "col", "colgroup",
    "dd", "details", "dialog", "dir", "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer", "form", "frame",
    "frameset", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hr", "html", "iframe", "legend", "li", "link",
    "main", "menu", "menuitem", "meta", "nav", "noframes", "ol", "optgroup", "option", "p", "param", "search",
    "section", "summary", "table", "tbody", "td", "tfoot", "th", "thead", "title", "tr", "track", "ul",
)

private val DELIMITER_ROW = java.util.regex.Pattern.compile("(?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?")

private val TABLE_ALIGN_CHARS = Regex("^\\||\\| *$")

private val JS_SPACES_RUN = Regex("[\\t\\n\\u000B\\f\\r \\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF]+")
