import { App, FuzzySuggestModal, TFile } from 'obsidian'
import { Highlight } from '../types'

export interface MatchedNote {
	file: TFile
	matchPercentage: number
	matchingTags: string[]
}

interface DestinationOption {
	type: 'new' | 'existing'
	file?: TFile
	displayText: string
	matchPercentage?: number
	matchingTags?: string[]
}

export class DestinationModal extends FuzzySuggestModal<DestinationOption> {
	private highlight: Highlight
	private matchedNotes: MatchedNote[]
	private onChoose: (destination: 'new' | TFile) => void

	constructor(
		app: App,
		highlight: Highlight,
		matchedNotes: MatchedNote[],
		onChoose: (destination: 'new' | TFile) => void
	) {
		super(app)
		this.highlight = highlight
		this.matchedNotes = matchedNotes
		this.onChoose = onChoose

		// Customize modal
		this.setPlaceholder('Search to filter notes (Esc to cancel)')
		this.setInstructions([
			{ command: '↑↓', purpose: 'navigate' },
			{ command: '↵', purpose: 'select' },
			{ command: 'esc', purpose: 'cancel' },
		])
	}

	getItems(): DestinationOption[] {
		const items: DestinationOption[] = []

		// Always add "Create new note" as first option
		items.push({
			type: 'new',
			displayText: 'Create new note',
		})

		// Add matched notes
		for (const match of this.matchedNotes) {
			items.push({
				type: 'existing',
				file: match.file,
				displayText: match.file.basename,
				matchPercentage: match.matchPercentage,
				matchingTags: match.matchingTags,
			})
		}

		return items
	}

	getItemText(item: DestinationOption): string {
		if (item.type === 'new') {
			return item.displayText
		}
		// Include tags in search text
		const tags = item.matchingTags?.join(' ') || ''
		return `${item.displayText} ${tags}`
	}

	onChooseItem(item: DestinationOption): void {
		if (item.type === 'new') {
			this.onChoose('new')
		} else if (item.file) {
			this.onChoose(item.file)
		}
		this.close()
	}

	renderSuggestion(match: { item: DestinationOption }, el: HTMLElement): void {
		const item = match.item
		el.addClass('zettelizer-destination-suggestion')

		const container = el.createDiv({ cls: 'zettelizer-destination-content' })
		container.createDiv({ cls: 'zettelizer-destination-title' }).setText(item.displayText)

		if (item.type === 'existing' && item.file) {
			this.renderMatchInfo(container.createDiv({ cls: 'zettelizer-destination-info' }), item)
		}
	}

	private renderMatchInfo(infoEl: HTMLElement, item: DestinationOption): void {
		this.renderNoteTitle(infoEl, item.file)

		infoEl
			.createSpan({ cls: 'zettelizer-match-percentage' })
			.setText(`${Math.round(item.matchPercentage ?? 0)}% match`)

		renderMatchedTags(infoEl, item.matchingTags ?? [])
	}

	private renderNoteTitle(infoEl: HTMLElement, file?: TFile): void {
		if (!file) return
		const title: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter?.title
		if (!title) return

		infoEl.createSpan({ cls: 'zettelizer-note-title' }).setText(`Title: "${String(title)}"`)
		infoEl.createEl('br')
	}

	onOpen(): void {
		void super.onOpen()

		const modalContent = this.modalEl.querySelector('.prompt')
		if (modalContent) this.renderHighlightInfo(modalContent as HTMLElement)
	}

	private renderHighlightInfo(parent: HTMLElement): void {
		const { text, tags } = this.highlight
		const maxLength = 100
		const info = parent.createDiv({ cls: 'zettelizer-highlight-info' })

		info.createDiv({
			cls: 'zettelizer-highlight-text',
			text: text.length > maxLength ? text.slice(0, maxLength) + '...' : text,
		})

		if (tags?.length) {
			info.createDiv({ cls: 'zettelizer-highlight-tags', text: `Tags: ${formatTags(tags)}` })
		}
	}
}

function formatTags(tags: string[]): string {
	return tags.map((t) => `#${t}`).join(' ')
}

function renderMatchedTags(infoEl: HTMLElement, tags: string[]): void {
	if (tags.length === 0) return
	infoEl.createSpan({ cls: 'zettelizer-matching-tags' }).setText(` - Matched: ${formatTags(tags)}`)
}
