import type { Highlight } from '../types'

// Matches a block ID (^blockid) at the end of a line
const BLOCK_ID_REGEX = /\s*\^([\w-]+)\s*$/

/** Tags are case-insensitive, so they are normalized to lowercase. */
function extractTags(line: string): string[] {
	return [...line.matchAll(/#([\w-]+)/g)].map((m) => m[1].toLowerCase())
}

/**
 * Whether a (trimmed) line belongs to the same block as the line after it.
 * Readwise highlights are typically blockquotes (>) or continuous text.
 */
function continuesBlock(line: string, isBlockquote: boolean): boolean {
	if (isBlockquote) return line.startsWith('>')
	return line !== '' && !line.startsWith('#') && !line.startsWith('---')
}

/** Looks backwards from the block ID line to find where the highlight starts. */
function findBlockStart(lines: string[], endIndex: number): number {
	const isBlockquote = lines[endIndex].trim().startsWith('>')
	let start = endIndex
	while (start > 0 && continuesBlock(lines[start - 1].trim(), isBlockquote)) {
		start--
	}
	return start
}

/** Strips blockquote markers, the block ID (last line only) and markdown formatting. */
function cleanLine(line: string, isLast: boolean): string {
	let text = line
	if (text.trim().startsWith('>')) text = text.replace(/^\s*>\s?/, '')
	if (isLast) text = text.replace(BLOCK_ID_REGEX, '')
	return text.replace(/==/g, '').replace(/\*\*/g, '').replace(/__/g, '').trim()
}

function parseHighlightAt(lines: string[], index: number): Highlight | null {
	const match = lines[index].match(BLOCK_ID_REGEX)
	if (!match) return null

	const start = findBlockStart(lines, index)
	const text = lines
		.slice(start, index + 1)
		.map((line, offset) => cleanLine(line, start + offset === index))
		.filter((line) => line.length > 0)
		.join(' ')
		.trim()
	if (text.length === 0) return null

	const tags = extractTags(lines[index])
	return { text, blockId: match[1], tags: tags.length > 0 ? tags : undefined }
}

/**
 * Parses markdown content to extract blocks with block IDs
 * @param content The markdown content to parse
 * @returns Array of Highlight objects with text and blockId
 */
export function parseHighlightsFromContent(content: string): Highlight[] {
	const lines = content.split('\n')
	return lines.flatMap((_, i) => parseHighlightAt(lines, i) ?? [])
}
