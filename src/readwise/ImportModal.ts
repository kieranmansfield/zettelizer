import { FuzzySuggestModal, App } from 'obsidian'
import type { RwDocument } from './api'

export class ImportModal extends FuzzySuggestModal<RwDocument> {
	constructor(
		app: App,
		private docs: RwDocument[],
		private onChoose: (doc: RwDocument) => void
	) {
		super(app)
		this.setPlaceholder('Select a Readwise document to import')
	}

	getItems = () => this.docs

	getItemText = (d: RwDocument) =>
		`${d.title} — ${d.author || 'unknown'} · ${d.category} · ${d.num_highlights} highlights`

	onChooseItem = (d: RwDocument) => this.onChoose(d)
}
