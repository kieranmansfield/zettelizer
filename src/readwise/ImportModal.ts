import { FuzzySuggestModal, App, type FuzzyMatch } from 'obsidian'
import type { RwDocument } from './library'

const READY = 'Select a Readwise document to import'

export class ImportModal extends FuzzySuggestModal<RwDocument> {
	private docs: RwDocument[] = []
	private unsubscribe?: () => void

	/** `subscribe` feeds the list as it loads, so the modal can open before it is complete. */
	constructor(
		app: App,
		private subscribe: (listener: (docs: RwDocument[]) => void) => () => void,
		private onChoose: (doc: RwDocument) => void
	) {
		super(app)
		this.setPlaceholder('Loading Readwise documents…')
	}

	onOpen(): void {
		super.onOpen()
		this.unsubscribe = this.subscribe((docs) => {
			this.docs = docs
			this.setPlaceholder(READY)
			// Re-run the search for whatever is typed; the modal refreshes its list on input.
			this.inputEl.dispatchEvent(new Event('input'))
		})
	}

	onClose(): void {
		super.onClose()
		this.unsubscribe?.()
	}

	getItems = () => this.docs

	/** Documents without highlights only show up once you search for them. */
	// fallow-ignore-next-line unused-class-member -- overrides FuzzySuggestModal, called by Obsidian
	getSuggestions(query: string): FuzzyMatch<RwDocument>[] {
		const matches = super.getSuggestions(query)
		return query.trim() ? matches : matches.filter((m) => m.item.num_highlights > 0)
	}

	getItemText = (d: RwDocument) =>
		`${d.title} — ${d.author || 'unknown'} · ${d.category} · ${d.num_highlights} highlights`

	onChooseItem = (d: RwDocument) => this.onChoose(d)
}
