import type { RwExport } from './api'

const q = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/** Renders an exported Readwise document to markdown matching the official plugin layout. */
// fallow-ignore-next-line complexity -- no test harness in this plugin; thin API glue
export function renderDocument(doc: RwExport, status = 'process'): string {
	const id = doc.user_book_id
	const tags = new Set<string>()
	for (const h of doc.highlights) for (const t of h.tags ?? []) tags.add(t.name)

	const fm = ['---']
	if (tags.size) fm.push('tags:', ...[...tags].map((t) => `  - keywords/${t}`))
	fm.push(`title: ${q(doc.title)}`, `type: readwise-${doc.category}`, `status: ${status}`)
	if (doc.author) fm.push('authors:', `  - ${q(doc.author)}`)
	fm.push(`id: ${q(String(id))}`)
	if (doc.cover_image_url) fm.push(`image: ${q(doc.cover_image_url)}`)
	fm.push('sources:')
	if (doc.source_url) fm.push(`  - ${q(doc.source_url)}`)
	fm.push(`  - ${q(`https://readwise.io/bookreview/${id}`)}`, '---', '', '# Highlights')

	const body = doc.highlights.map((h) => {
		const note = h.note ? `\n\n**Note:** ${h.note}` : ''
		return `> <mark>${h.text.replace(/\n+/g, ' ')}</mark> ^${h.id}${note}\n\n\n---`
	})
	return [...fm, ...body, ''].join('\n')
}

/** Strips characters that are illegal in file names. */
export const safeName = (s: string) => s.replace(/[\\/:*?"<>|#^[\]]/g, '').trim()
