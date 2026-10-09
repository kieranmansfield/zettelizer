import { FuzzySuggestModal } from 'obsidian'

/** A suggest modal that is asked as a question: `prompt()` resolves with the answer, or null on cancel. */
export abstract class PromptSuggestModal<Item, Result> extends FuzzySuggestModal<Item> {
	private settle?: (value: Result | null) => void

	prompt(): Promise<Result | null> {
		return new Promise((resolve) => {
			this.settle = resolve
			this.open()
		})
	}

	protected answer(value: Result): void {
		this.settle?.(value)
		this.settle = undefined
	}

	onClose(): void {
		super.onClose()
		// Obsidian closes the modal before it calls onChooseItem, so cancel only after that has run.
		setTimeout(() => {
			this.settle?.(null)
			this.settle = undefined
		}, 0)
	}
}
