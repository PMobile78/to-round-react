package com.pmobile78.todoround.core.markdown

import java.util.regex.Matcher
import java.util.regex.Pattern

/*
 * The inline level of the web's Markdown: inlineTokens of marked 17.0.6 with GFM on (src/Lexer.ts,
 * src/Tokenizer.ts, src/rules.ts). The regular expressions keep marked's own, with \s, \S, \w, "."
 * and $ spelled out as JavaScript reads them, since java.util.regex (ICU on Android) reads those
 * differently; the plain text between them is found by hand.
 */

/** An inline token of marked. */
internal sealed interface Inl

internal class TextInl(raw: String, text: String = raw) : Inl {
    private val rawPart = StringBuilder(raw)
    private val textPart = StringBuilder(text)
    val raw: String get() = rawPart.toString()
    val text: String get() = textPart.toString()

    /** The text token goes on with the next one (marked joins neighbouring text tokens). */
    fun append(raw: String, text: String) {
        rawPart.append(raw)
        textPart.append(text)
    }
}

internal class EscapeInl(val raw: String, val text: String) : Inl

internal class HtmlInl(val raw: String) : Inl

internal class LinkInl(val raw: String, val href: String, val title: String?, val tokens: List<Inl>, val image: Boolean) : Inl

internal class StrongInl(val raw: String, val tokens: List<Inl>) : Inl

internal class EmInl(val raw: String, val tokens: List<Inl>) : Inl

internal class DelInl(val raw: String, val tokens: List<Inl>) : Inl

internal class CodespanInl(val raw: String, val text: String) : Inl

internal class BrInl(val raw: String) : Inl

/** marked's checkbox inside the first paragraph of a task item of a loose list; TipTap shows nothing for it. */
internal data object CheckboxInl : Inl

private fun Inl.rawText(): String = when (this) {
    is TextInl -> raw
    is EscapeInl -> raw
    is HtmlInl -> raw
    is LinkInl -> raw
    is StrongInl -> raw
    is EmInl -> raw
    is DelInl -> raw
    is CodespanInl -> raw
    is BrInl -> raw
    CheckboxInl -> ""
}

// JavaScript's \s and its complement, as classes of java.util.regex.
private const val S = "\\t\\n\\u000B\\f\\r \\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF"
private const val SPACE = "[${S}]"
private const val ANY = "[\\x{0}-\\x{10FFFF}]"
private const val DOT = "[^\\n\\r\\u2028\\u2029]"
private const val PUNCT = "[\\p{P}\\p{S}]"
private const val PUNCT_SPACE = "[${S}\\p{P}\\p{S}]"
private const val NOT_PUNCT_SPACE = "[^${S}\\p{P}\\p{S}]"
private const val GFM_PUNCT = "(?!~)[\\p{P}\\p{S}]"
private const val GFM_PUNCT_SPACE = "(?!~)[${S}\\p{P}\\p{S}]"
private const val GFM_NOT_PUNCT_SPACE = "(?:[^${S}\\p{P}\\p{S}]|~)"

private fun regex(source: String): Pattern = Pattern.compile(source)

private val ESCAPE = regex("^\\\\([!\"#$%&'()*+,\\-./:;<=>?@\\[\\]\\\\^_`{|}~])")

private const val TAG_ATTRIBUTE = "${SPACE}+[a-zA-Z:_][A-Za-z0-9_.:-]*(?:${SPACE}*=${SPACE}*\"[^\"]*\"|${SPACE}*=${SPACE}*'[^']*'|${SPACE}*=${SPACE}*[^${S}\"'=<>`]+)?"
private val TAG = regex(
    "^<!--(?:-?>|$ANY*?-->)" +
        "|^</[a-zA-Z][A-Za-z0-9_:-]*${SPACE}*>" +
        "|^<[a-zA-Z][A-Za-z0-9_-]*(?:$TAG_ATTRIBUTE)*?${SPACE}*/?>" +
        "|^<\\?$ANY*?\\?>" +
        "|^<![a-zA-Z]+${SPACE}$ANY*?>" +
        "|^<!\\[CDATA\\[$ANY*?\\]\\]>",
)

private const val INLINE_LABEL = "(?:\\[(?:\\\\$ANY|[^\\[\\]\\\\])*\\]|\\\\$ANY|`+(?!`)[^`]*?`+(?!`)|``+(?=\\])|[^\\[\\]\\\\`])*?"
private const val BLOCK_LABEL = "(?!${SPACE}*\\])(?:\\\\$ANY|[^\\[\\]\\\\])+"
private val LINK = regex(
    "^!?\\[($INLINE_LABEL)\\]\\(${SPACE}*(<(?:\\\\$DOT|[^\\n<>\\\\])+>|[^ \\t\\n\\x00-\\x1f]*)" +
        "(?:(?:[ \\t]+(?:\\n[ \\t]*)?|\\n[ \\t]*)(\"(?:\\\\\"?|[^\"\\\\])*\"|'(?:\\\\'?|[^'\\\\])*'|\\((?:\\\\\\)?|[^)\\\\])*\\)))?${SPACE}*\\)",
)
private val REFLINK = regex("^!?\\[($INLINE_LABEL)\\]\\[($BLOCK_LABEL)\\]")
private val NOLINK = regex("^!?\\[($BLOCK_LABEL)\\](?:\\[\\])?")
private val REFLINK_SEARCH = regex("!?\\[($INLINE_LABEL)\\]\\[($BLOCK_LABEL)\\]|!?\\[($BLOCK_LABEL)\\](?:\\[\\])?(?!\\()")

private val ANY_PUNCTUATION = regex("\\\\($PUNCT)")
private val BLOCK_SKIP = regex(
    "\\[(?:[^\\[\\]`]|(?<a>`+)[^`]+\\k<a>(?!`))*?\\]\\((?:\\\\$ANY|[^\\\\()]|\\((?:\\\\$ANY|[^\\\\()])*\\))*\\)" +
        "|(?<!`)()(?<b>`+)[^`]+\\k<b>(?!`)" +
        "|<(?! )[^<>]*?>",
)

private val EM_STRONG_L = regex("^(?:\\*+(?:((?!\\*)$GFM_PUNCT)|([^${S}*]))?)|^_+(?:((?!_)$GFM_PUNCT)|([^${S}_]))?")
private val EM_STRONG_R_AST = regex(
    "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)" +
        "|[^*]+(?=[^*])" +
        "|(?!\\*)$GFM_PUNCT(\\*+)(?=${SPACE}|\\z)" +
        "|$GFM_NOT_PUNCT_SPACE(\\*+)(?!\\*)(?=$GFM_PUNCT_SPACE|\\z)" +
        "|(?!\\*)$GFM_PUNCT_SPACE(\\*+)(?=$GFM_NOT_PUNCT_SPACE)" +
        "|${SPACE}(\\*+)(?!\\*)(?=$GFM_PUNCT)" +
        "|(?!\\*)$GFM_PUNCT(\\*+)(?!\\*)(?=$GFM_PUNCT)" +
        "|$GFM_NOT_PUNCT_SPACE(\\*+)(?=$GFM_NOT_PUNCT_SPACE)",
)
private val EM_STRONG_R_UND = regex(
    "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)" +
        "|[^_]+(?=[^_])" +
        "|(?!_)$PUNCT(_+)(?=${SPACE}|\\z)" +
        "|$NOT_PUNCT_SPACE(_+)(?!_)(?=$PUNCT_SPACE|\\z)" +
        "|(?!_)$PUNCT_SPACE(_+)(?=$NOT_PUNCT_SPACE)" +
        "|${SPACE}(_+)(?!_)(?=$PUNCT)" +
        "|(?!_)$PUNCT(_+)(?!_)(?=$PUNCT)",
)
private val DEL_L = regex("^~~?(?:((?!~)$PUNCT)|[^${S}~])")
private val DEL_R = regex(
    "^[^~]+(?=[^~])" +
        "|(?!~)$PUNCT(~~?)(?=${SPACE}|\\z)" +
        "|$NOT_PUNCT_SPACE(~~?)(?!~)(?=$PUNCT_SPACE|\\z)" +
        "|(?!~)$PUNCT_SPACE(~~?)(?=$NOT_PUNCT_SPACE)" +
        "|${SPACE}(~~?)(?!~)(?=$PUNCT)" +
        "|(?!~)$PUNCT(~~?)(?!~)(?=$PUNCT)" +
        "|$NOT_PUNCT_SPACE(~~?)(?=$NOT_PUNCT_SPACE)",
)
private val PUNCTUATION = regex("^((?![*_])$PUNCT_SPACE)")
private val UNICODE_ALPHANUMERIC = regex("[\\p{L}\\p{N}]")

private val CODE = regex("^(`+)([^`]|[^`]$ANY*?[^`])\\1(?!`)")
private val BR = regex("^( {2,}|\\\\)\\n(?!${SPACE}*\\z)")
private const val EMAIL_AUTOLINK =
    "[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])"
private val AUTOLINK = regex("^<([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^${S}\\x00-\\x1f<>]*|$EMAIL_AUTOLINK)>")
private val URL = regex(
    "^((?:[hH][tT][tT][pP][sS]?|[fF][tT][pP]):\\/\\/|www\\.)(?:[a-zA-Z0-9\\-]+\\.?)+[^${S}<]*" +
        "|^[A-Za-z0-9._+-]+(@)[a-zA-Z0-9_\\-]+(?:\\.[a-zA-Z0-9_\\-]*[a-zA-Z0-9])+(?![-_])",
)

// startATag, endATag, startPreScriptTag and endPreScriptTag of marked, which take any case of ASCII letters.
private val START_A_TAG = regex("^<[aA] ")
private val END_A_TAG = regex("^</[aA]>")
private const val PRE_SCRIPT = "(?:[pP][rR][eE]|[cC][oO][dD][eE]|[kK][bB][dD]|[sS][cC][rR][iI][pP][tT])"
private val START_PRE_SCRIPT = regex("^<$PRE_SCRIPT(?:${SPACE}|>)")
private val END_PRE_SCRIPT = regex("^</$PRE_SCRIPT(?:${SPACE}|>)")

/** marked's anyPunctuation replace: a backslash before punctuation goes. */
internal fun unescapePunctuation(text: String): String = ANY_PUNCTUATION.matcher(text).replaceAll("$1")

/** The inline lexer of one call of inlineTokens; the link state lives in [lexer], as marked keeps it. */
internal class InlineLexer(private val lexer: Lexer) {
    // The text and its masked copy; the tokenizers read them from an index, where marked cuts a new string.
    private var source = ""
    private var masked = ""

    fun tokens(text: String): List<Inl> {
        source = text
        masked = mask(text)
        val tokens = mutableListOf<Inl>()
        var pos = 0
        var keepPrevChar = false
        var prevChar = ""
        while (pos < source.length) {
            if (!keepPrevChar) prevChar = ""
            keepPrevChar = false
            val token = escape(pos) ?: tag(pos) ?: link(pos)
            if (token != null) {
                pos += token.rawText().length
                tokens += token
                continue
            }
            val ref = reflink(pos)
            if (ref != null) {
                pos += ref.rawText().length
                val last = tokens.lastOrNull()
                if (ref is TextInl && last is TextInl) last.append(ref.raw, ref.text) else tokens += ref
                continue
            }
            val other = emStrong(pos, prevChar) ?: codespan(pos) ?: br(pos) ?: del(pos, prevChar) ?: autolink(pos)
                ?: if (!lexer.inLink) url(pos) else null
            if (other != null) {
                pos += other.rawText().length
                tokens += other
                continue
            }
            val end = inlineTextEnd(pos)
            val raw = source.substring(pos, end)
            pos = end
            if (!raw.endsWith("_")) prevChar = raw.substring(raw.length - 1)
            keepPrevChar = true
            val last = tokens.lastOrNull()
            if (last is TextInl) last.append(raw, raw) else tokens += TextInl(raw)
        }
        return tokens
    }

    private fun matcher(pattern: Pattern, at: Int): Matcher = pattern.matcher(source).region(at, source.length)

    // The source with links of known references, escapes, links, code and tags masked, so that their
    // marks are no delimiters of emphasis. A mask keeps the length, as marked's does, except for an escaped
    // character of two halves; the matching then goes on where it was, as in marked.
    private fun mask(text: String): String {
        val masked = StringBuilder(text)
        if (lexer.links.isNotEmpty()) {
            val m = REFLINK_SEARCH.matcher(masked)
            while (m.find()) {
                val found = m.group()
                if (found.substring(found.lastIndexOf('[') + 1, found.length - 1) in lexer.links) {
                    overwrite(masked, m.start(), m.end())
                }
            }
        }
        val escapes = ANY_PUNCTUATION.matcher(masked)
        while (escapes.find()) {
            val start = escapes.start()
            val end = escapes.end()
            masked.replace(start, end, "++")
            if (end - start != 2) {
                escapes.reset(masked)
                escapes.region(minOf(end, masked.length), masked.length)
            }
        }
        val skips = BLOCK_SKIP.matcher(masked)
        while (skips.find()) overwrite(masked, skips.start(), skips.end())
        return masked.toString()
    }

    // "[" + "a" * (length - 2) + "]" over [start, end).
    private fun overwrite(text: StringBuilder, start: Int, end: Int) {
        text.setCharAt(start, '[')
        for (i in start + 1 until end - 1) text.setCharAt(i, 'a')
        text.setCharAt(end - 1, ']')
    }

    private fun escape(pos: Int): Inl? {
        if (source[pos] != '\\') return null
        val m = matcher(ESCAPE, pos)
        return if (m.lookingAt()) EscapeInl(m.group(), m.group(1)) else null
    }

    private fun tag(pos: Int): Inl? {
        if (source[pos] != '<') return null
        val m = matcher(TAG, pos)
        if (!m.lookingAt()) return null
        val raw = m.group()
        if (!lexer.inLink && START_A_TAG.matcher(raw).lookingAt()) {
            lexer.inLink = true
        } else if (lexer.inLink && END_A_TAG.matcher(raw).lookingAt()) {
            lexer.inLink = false
        }
        if (!lexer.inRawBlock && START_PRE_SCRIPT.matcher(raw).lookingAt()) {
            lexer.inRawBlock = true
        } else if (lexer.inRawBlock && END_PRE_SCRIPT.matcher(raw).lookingAt()) {
            lexer.inRawBlock = false
        }
        return HtmlInl(raw)
    }

    private fun link(pos: Int): Inl? {
        if (!(source.startsWith("[", pos) || source.startsWith("![", pos))) return null
        if (source.indexOf("](", pos) < 0) return null
        val m = matcher(LINK, pos)
        if (!m.lookingAt()) return null
        var cap0 = m.group()
        val label = m.group(1)
        var href = m.group(2)
        var title: String? = m.group(3)
        val trimmedUrl = href.jsTrim()
        if (trimmedUrl.startsWith("<")) {
            if (!trimmedUrl.endsWith(">")) return null
            val rtrimSlash = trimmedUrl.substring(0, trimmedUrl.length - 1).trimEnd('\\')
            if ((trimmedUrl.length - rtrimSlash.length) % 2 == 0) return null
        } else {
            val lastParenIndex = findClosingBracket(href, '(', ')')
            if (lastParenIndex == -2) return null
            if (lastParenIndex > -1) {
                val start = if (cap0.startsWith("!")) 5 else 4
                val linkLen = start + label.length + lastParenIndex
                href = href.substring(0, lastParenIndex)
                cap0 = cap0.substring(0, linkLen).jsTrim()
                title = ""
            }
        }
        var titleText = if (title.isNullOrEmpty()) "" else title.substring(1, title.length - 1)
        href = href.jsTrim()
        if (href.startsWith("<")) href = href.substring(1, href.length - 1)
        href = if (href.isEmpty()) href else unescapePunctuation(href)
        titleText = if (titleText.isEmpty()) titleText else unescapePunctuation(titleText)
        return outputLink(cap0, label, href, titleText.ifEmpty { null })
    }

    private fun reflink(pos: Int): Inl? {
        if (!(source.startsWith("[", pos) || source.startsWith("![", pos))) return null
        var m = matcher(REFLINK, pos)
        val label: String
        if (m.lookingAt()) {
            label = m.group(2) ?: m.group(1)
        } else {
            m = matcher(NOLINK, pos)
            if (!m.lookingAt()) return null
            label = m.group(1)
        }
        val raw = m.group()
        val def = lexer.links[label.replace(JS_SPACE_RUN, " ").lowercase()]
        if (def == null) return TextInl(raw.substring(0, 1))
        return outputLink(raw, m.group(1), def.href, def.title)
    }

    private fun outputLink(raw: String, label: String, href: String, title: String?): Inl {
        val text = label.replace(OUTPUT_LINK_REPLACE, "$1")
        lexer.inLink = true
        val tokens = InlineLexer(lexer).tokens(text)
        lexer.inLink = false
        return LinkInl(raw, href, title, tokens, image = raw.startsWith("!"))
    }

    private fun emStrong(pos: Int, prevChar: String): Inl? {
        if (source[pos] != '*' && source[pos] != '_') return null
        val l = matcher(EM_STRONG_L, pos)
        if (!l.lookingAt()) return null
        if (l.group(1) == null && l.group(2) == null && l.group(3) == null && l.group(4) == null) return null
        if (l.group(4) != null && UNICODE_ALPHANUMERIC.matcher(prevChar).find()) return null
        val nextChar = l.group(1) ?: l.group(3) ?: ""
        if (!(nextChar.isEmpty() || prevChar.isEmpty() || PUNCTUATION.matcher(prevChar).find())) return null
        val lLength = l.group().codePointCount(0, l.group().length) - 1
        var delimTotal = lLength
        var midDelimTotal = 0
        val endReg = if (source[pos] == '*') EM_STRONG_R_AST else EM_STRONG_R_UND
        // maskedSrc.slice(-1 * src.length + lLength): the masked text after the left delimiter.
        val from = maxOf(0, masked.length - (source.length - pos) + lLength)
        val r = endReg.matcher(masked).region(from, masked.length)
        while (r.find()) {
            val rDelim = (1..6).firstNotNullOfOrNull { group(r, it) } ?: continue
            var rLength = rDelim.codePointCount(0, rDelim.length)
            if (group(r, 3) != null || group(r, 4) != null) {
                delimTotal += rLength
                continue
            } else if (group(r, 5) != null || group(r, 6) != null) {
                if (lLength % 3 != 0 && (lLength + rLength) % 3 == 0) {
                    midDelimTotal += rLength
                    continue
                }
            }
            delimTotal -= rLength
            if (delimTotal > 0) continue
            rLength = minOf(rLength, rLength + delimTotal + midDelimTotal)
            val lastCharLength = Character.charCount(r.group().codePointAt(0))
            val raw = source.substring(pos, minOf(source.length, pos + lLength + (r.start() - from) + lastCharLength + rLength))
            if (minOf(lLength, rLength) % 2 == 1) {
                return EmInl(raw, InlineLexer(lexer).tokens(raw.substring(1, raw.length - 1)))
            }
            return StrongInl(raw, InlineLexer(lexer).tokens(raw.substring(2, raw.length - 2)))
        }
        return null
    }

    // The group [n] of a match of the delimiter patterns, which the underscore one has only five of.
    private fun group(m: Matcher, n: Int): String? = if (n <= m.groupCount()) m.group(n) else null

    private fun codespan(pos: Int): Inl? {
        if (source[pos] != '`') return null
        val m = matcher(CODE, pos)
        if (!m.lookingAt()) return null
        var text = m.group(2).replace('\n', ' ')
        val hasNonSpace = text.any { it != ' ' }
        if (hasNonSpace && text.startsWith(" ") && text.endsWith(" ")) text = text.substring(1, text.length - 1)
        return CodespanInl(m.group(), text)
    }

    private fun br(pos: Int): Inl? {
        if (source[pos] != ' ' && source[pos] != '\\') return null
        val m = matcher(BR, pos)
        return if (m.lookingAt()) BrInl(m.group()) else null
    }

    private fun del(pos: Int, prevChar: String): Inl? {
        if (source[pos] != '~') return null
        val l = matcher(DEL_L, pos)
        if (!l.lookingAt()) return null
        val nextChar = l.group(1) ?: ""
        if (!(nextChar.isEmpty() || prevChar.isEmpty() || PUNCTUATION.matcher(prevChar).find())) return null
        val lLength = l.group().codePointCount(0, l.group().length) - 1
        var delimTotal = lLength
        val from = maxOf(0, masked.length - (source.length - pos) + lLength)
        val r = DEL_R.matcher(masked).region(from, masked.length)
        while (r.find()) {
            val rDelim = (1..6).firstNotNullOfOrNull { r.group(it) } ?: continue
            var rLength = rDelim.codePointCount(0, rDelim.length)
            if (rLength != lLength) continue
            if (r.group(3) != null || r.group(4) != null) {
                delimTotal += rLength
                continue
            }
            delimTotal -= rLength
            if (delimTotal > 0) continue
            rLength = minOf(rLength, rLength + delimTotal)
            val lastCharLength = Character.charCount(r.group().codePointAt(0))
            val raw = source.substring(pos, minOf(source.length, pos + lLength + (r.start() - from) + lastCharLength + rLength))
            return DelInl(raw, InlineLexer(lexer).tokens(raw.substring(lLength, raw.length - lLength)))
        }
        return null
    }

    private fun autolink(pos: Int): Inl? {
        if (source[pos] != '<') return null
        val m = matcher(AUTOLINK, pos)
        if (!m.lookingAt()) return null
        val text = m.group(1)
        val href = if (m.group(2) == "@") "mailto:$text" else text
        return LinkInl(m.group(), href, null, listOf(TextInl(text)), image = false)
    }

    private fun url(pos: Int): Inl? {
        val m = matcher(URL, pos)
        if (!m.lookingAt()) return null
        val text: String
        val href: String
        if (m.group(2) == "@") {
            text = m.group()
            href = "mailto:$text"
        } else {
            var cap0 = m.group()
            while (true) {
                val shorter = backpedal(cap0)
                if (shorter == cap0) break
                cap0 = shorter
            }
            text = cap0
            href = if (m.group(1) == "www.") "http://$cap0" else cap0
        }
        return LinkInl(text, href, null, listOf(TextInl(text)), image = false)
    }

    // _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, its match from the start:
    // the address without the punctuation that ends a sentence after it.
    private fun backpedal(text: String): String {
        var p = 0
        while (p < text.length) {
            val c = text[p]
            when {
                c !in URL_SPECIAL -> while (p < text.length && text[p] !in URL_SPECIAL) p++
                c == '(' -> {
                    val close = text.indexOf(')', p + 1)
                    if (close < 0) break
                    p = close + 1
                }
                c == '&' -> {
                    if (ENTITY_AT_END.matcher(text.substring(p + 1)).matches()) break
                    p++
                }
                else -> {
                    var q = p
                    while (q < text.length && text[q] in URL_TRAILING) q++
                    if (q == text.length) {
                        if (q - p == 1) break
                        q--
                    }
                    p = q
                }
            }
        }
        return text.substring(0, p)
    }

    // inlineText of GFM: from the first character (or run of ` and ~) up to where another token may start.
    private fun inlineTextEnd(pos: Int): Int {
        val src = source
        var i = pos + 1
        if (src[pos] == '`' || src[pos] == '~') {
            while (i < src.length && (src[i] == '`' || src[i] == '~')) i++
        }
        if (spacesThenNewline(src, i) || emailAhead(src, i)) return i
        var j = i
        while (true) {
            if (j >= src.length) return j
            val c = src[j]
            if (c in "\\<![`*~_" || startsProtocol(src, j) || src.startsWith("www.", j)) return j
            if (c != ' ' && spacesThenNewline(src, j + 1)) return j + 1
            if (!isEmailChar(c) && emailAhead(src, j + 1)) return j + 1
            j++
        }
    }

    private fun spacesThenNewline(src: String, at: Int): Boolean {
        var q = at
        while (q < src.length && src[q] == ' ') q++
        return q - at >= 2 && q < src.length && src[q] == '\n'
    }

    private fun emailAhead(src: String, at: Int): Boolean {
        var q = at
        while (q < src.length && isEmailChar(src[q])) q++
        return q > at && q < src.length && src[q] == '@'
    }

    private fun isEmailChar(c: Char): Boolean =
        c in 'a'..'z' || c in 'A'..'Z' || c in '0'..'9' || c in ".!#$%&'*+/=?_`{|}~-"

    private fun isWord(c: Char): Boolean = c in 'a'..'z' || c in 'A'..'Z' || c in '0'..'9' || c == '_'

    // protocol:\/\/ with protocol = [hH][tT][tT][pP][sS]?|[fF][tT][pP]
    private fun startsProtocol(src: String, at: Int): Boolean =
        startsAscii(src, "http://", at) || startsAscii(src, "https://", at) || startsAscii(src, "ftp://", at)

    // [prefix] at [at] in any case of its ASCII letters.
    private fun startsAscii(src: String, prefix: String, at: Int): Boolean =
        at + prefix.length <= src.length && prefix.indices.all { src[at + it] == prefix[it] || src[at + it] == prefix[it].uppercaseChar() }

    private fun findClosingBracket(text: String, open: Char, close: Char): Int {
        if (close !in text) return -1
        var level = 0
        var i = 0
        while (i < text.length) {
            when (text[i]) {
                '\\' -> i++
                open -> level++
                close -> {
                    level--
                    if (level < 0) return i
                }
            }
            i++
        }
        return if (level > 0) -2 else -1
    }
}

private val OUTPUT_LINK_REPLACE = Regex("\\\\([\\[\\]])")
private val JS_SPACE_RUN = Regex("${SPACE}+")
private val ENTITY_AT_END = Pattern.compile("[a-zA-Z0-9]+;")
private const val URL_SPECIAL = "?!.,:;*_'\"~()&"
private const val URL_TRAILING = "?!.,:;*_'\"~)"
