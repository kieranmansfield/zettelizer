import { FuzzySuggestModal, App } from 'obsidian'

export const STATUSES = ['process', 'processing', 'processed']

export class StatusModal extends FuzzySuggestModal<string> {
	constructor(
		app: App,
		private current: string | undefined,
		private onChoose: (status: string) => void
	) {
		super(app)
		this.setPlaceholder('Select Readwise status')
	}

	getItems = () => STATUSES

	getItemText = (s: string) => (s === this.current ? `${s} (current)` : s)

	onChooseItem = (s: string) => this.onChoose(s)
}
