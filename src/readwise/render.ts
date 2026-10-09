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

export const DEFAULT_NOTE_TEMPLATE = `---
{{tagsYaml}}
title: {{title}}
type: readwise-{{category}}
status: {{status}}
{{authorsYaml}}
id: {{id}}
{{imageYaml}}
{{sourcesYaml}}
---

# Highlights
{{highlights}}
`

export const DEFAULT_HIGHLIGHT_TEMPLATE = `> <mark>{{text}}</mark>{{tags}} ^{{id}}{{noteBlock}}


---`

/** Single pass, so values are never re-scanned. A line holding only an empty placeholder is dropped. */
export function fill(template: string, vars: Record<string, string>): string {
	const lone = /^{{(\w+)}}\n/gm
	return template
		.replace(lone, (m, k: string) => (k in vars && vars[k] === '' ? '' : m))
		.replace(/{{(\w+)}}/g, (m, k: string) => (Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m))
}

/**
 * Renders an exported Readwise document to markdown. Document tags go in `tags`; highlight tags
 * stay with their highlight, inline on its block-id line. Empty templates mean the defaults.
 * Highlight notes are written out verbatim.
 */
export function renderDocument(
	doc: RwExport,
	documentTags: string[],
	status: string,
	templates: { note?: string; highlight?: string } = {}
): string {
	const id = doc.user_book_id

	const highlights = doc.highlights.map((h) =>
		fill(templates.highlight || DEFAULT_HIGHLIGHT_TEMPLATE, {
			text: h.text.replace(/\n+/g, ' '),
			id: String(h.id),
			tags: tagNames(h.tags).map((t) => ` #${t}`).join(''),
			note: h.note ?? '',
			noteBlock: h.note ? `\n\n**Note:** ${h.note}` : '',
		})
	)

	const sources = [doc.source_url, `https://readwise.io/bookreview/${id}`].filter((u): u is string => !!u)
	return fill(templates.note || DEFAULT_NOTE_TEMPLATE, {
		title: q(doc.title),
		author: doc.author ?? '',
		category: doc.category,
		status,
		id: q(String(id)),
		cover: doc.cover_image_url ?? '',
		url: doc.source_url ?? '',
		tagsYaml: yamlList('tags', documentTags.map(tagName).filter(Boolean)).join('\n'),
		authorsYaml: doc.author ? yamlList('authors', [q(doc.author)]).join('\n') : '',
		imageYaml: doc.cover_image_url ? `image: ${q(doc.cover_image_url)}` : '',
		sourcesYaml: yamlList('sources', sources.map(q)).join('\n'),
		highlights: highlights.join('\n'),
	})
}

export const DEFAULT_FILENAME_TEMPLATE = '{{title}} by {{author}} highlights'
/** Used instead of the default when the document has no author. */
export const DEFAULT_FILENAME_TEMPLATE_NO_AUTHOR = '{{title}} highlights'

/** Strips characters that are illegal in file names. */
export const safeName = (s: string) => s.replace(/[\\/:*?"<>|#^[\]]/g, '').trim()
