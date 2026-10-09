import { describe, expect, it } from 'vitest'
import { renderDocument } from './render'

const doc = { user_book_id: 7, title: 'T', author: '', category: 'books', highlights: [{ id: 1, text: 'a\nb', note: 'n' }] }

describe('renderDocument templates', () => {
	it('uses custom templates and drops empty lone-placeholder lines', () => {
		const md = renderDocument(doc, [], 'process', {
			note: '{{tagsYaml}}\n{{authorsYaml}}\n# {{title}}\n{{highlights}}',
			highlight: '- {{text}} ({{id}}) {{note}}',
		})
		expect(md).toBe('# "T"\n- a b (1) n')
	})

	it('does not re-scan inserted values for placeholders', () => {
		const md = renderDocument({ ...doc, title: '{{status}}' }, [], 'process', { note: '{{title}}' })
		expect(md).toBe('"{{status}}"')
	})
})
