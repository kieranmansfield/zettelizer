import type { RwExport } from './library'

// JSON strings are valid YAML double-quoted scalars (a wrapper: .map(JSON.stringify) would pass the index as `replacer`)
const q = (s: string) => JSON.stringify(s)

/** Readwise tag as an Obsidian tag: spaces become hyphens, anything but letters, digits, `_` and `-` is dropped. */
const tagName = (s: string) => {
	const name = s.trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]/gu, '').replace(/^-+|-+$/g, '')
	return /^\d+$/.test(name) ? `_${name}` : name // Obsidian rejects all-digit tags
}

const tagNames = (tags: { name: string }[] = []) => tags.map((t) => tagName(t.name)).filter(Boolean)

const yamlList = (key: string, items: Iterable<string>) => {
	const list = [...items]
	return list.length ? [`${key}:`, ...list.map((i) => `  - ${i}`)] : []
}

/**
 * Renders an exported Readwise document to markdown. Document tags go in `tags`; highlight tags
 * stay with their highlight, inline on its block-id line.
 * Highlight notes are written out verbatim.
 */
export function renderDocument(doc: RwExport, documentTags: string[], status: string): string {
	const id = doc.user_book_id

	const fm = [
		'---',
		...yamlList('tags', documentTags.map(tagName).filter(Boolean)),
		`title: ${q(doc.title)}`,
		`type: readwise-${doc.category}`,
		`status: ${status}`,
		...(doc.author ? yamlList('authors', [q(doc.author)]) : []),
		`id: ${q(String(id))}`,
		...(doc.cover_image_url ? [`image: ${q(doc.cover_image_url)}`] : []),
		...yamlList('sources', [doc.source_url, `https://readwise.io/bookreview/${id}`].filter((u): u is string => !!u).map(q)),
		'---',
		'',
		'# Highlights',
	]

	const body = doc.highlights.map((h) => {
		const inline = tagNames(h.tags).map((t) => ` #${t}`).join('')
		const note = h.note ? `\n\n**Note:** ${h.note}` : ''
		return `> <mark>${h.text.replace(/\n+/g, ' ')}</mark>${inline} ^${h.id}${note}\n\n\n---`
	})
	return [...fm, ...body, ''].join('\n')
}

/** Strips characters that are illegal in file names. */
export const safeName = (s: string) => s.replace(/[\\/:*?"<>|#^[\]]/g, '').trim()
