import { App, FuzzySuggestModal, FuzzyMatch } from "obsidian";
import { Highlight } from "../types";

interface HighlightItem {
	highlight: Highlight;
	displayText: string;
	searchText: string;
}

export class FuzzyHighlightModal extends FuzzySuggestModal<HighlightItem> {
	private highlights: Highlight[];
	private selected: Set<string>;
	private onChoose: (selected: Highlight[]) => void;
	private truncateLength: number;

	constructor(
		app: App,
		highlights: Highlight[],
		truncateLength: number,
		onChoose: (selected: Highlight[]) => void
	) {
		super(app);
		this.highlights = highlights;
		this.selected = new Set();
		this.onChoose = onChoose;
		this.truncateLength = truncateLength;

		// Customize modal
		this.setPlaceholder(
			"Search highlights (space to select, enter to confirm)"
		);
	}

	getItems(): HighlightItem[] {
		return this.highlights.map((highlight) => {
			const truncated =
				highlight.text.length > this.truncateLength
					? highlight.text.slice(0, this.truncateLength) + "..."
					: highlight.text;

			// Create searchable text that includes both text and block ID
			const searchText = `${highlight.text} ${highlight.blockId || ""}`;

			return {
				highlight,
				displayText: truncated,
				searchText,
			};
		});
	}

	getItemText(item: HighlightItem): string {
		return item.searchText;
	}

	onChooseItem(highlightItem: HighlightItem, evt: MouseEvent | KeyboardEvent): void {
		// When Enter is pressed without modifier, close and confirm
		const selectedHighlights = this.highlights.filter((h) =>
			this.selected.has(h.blockId || "")
		);

		if (selectedHighlights.length > 0) {
			this.onChoose(selectedHighlights);
		}
	}

	renderSuggestion(match: FuzzyMatch<HighlightItem>, el: HTMLElement): void {
		const item = match.item;
		const isChecked = this.selected.has(item.highlight.blockId || "");

		el.addClass("zettelizer-suggestion");
		if (isChecked) {
			el.addClass("is-checked");
		}

		// Create container
		const container = el.createDiv({ cls: "zettelizer-suggestion-content" });

		// Checkbox and text
		const mainLine = container.createDiv({ cls: "zettelizer-main-line" });

		// Create checkbox container
		const checkboxContainer = mainLine.createDiv({ cls: "zettelizer-checkbox-container" });
		const checkbox = checkboxContainer.createEl("input", {
			type: "checkbox",
			cls: "task-list-item-checkbox",
		});
		checkbox.checked = isChecked;
		checkbox.disabled = true; // Prevent direct clicking, use space bar instead

		mainLine.createSpan({
			cls: "zettelizer-text",
			text: item.displayText,
		});

		// Block ID on second line
		if (item.highlight.blockId) {
			const idLine = container.createDiv({ cls: "zettelizer-block-id" });
			idLine.createSpan({
				cls: "zettelizer-block-id-label",
				text: "^" + item.highlight.blockId,
			});
		}
	}

	// Override to handle space bar
	onOpen(): void {
		void super.onOpen();

		// Add event listener for space bar on modal
		this.modalEl.addEventListener("keydown", this.handleKeyDown);
	}

	onClose(): void {
		this.modalEl.removeEventListener("keydown", this.handleKeyDown);
		super.onClose();
	}

	private handleKeyDown = (evt: KeyboardEvent) => {
		if (evt.key === " " || evt.key === "Spacebar") {
			evt.preventDefault();
			evt.stopPropagation();
			this.toggleCurrentSelection();
		} else if (evt.key === "Enter" && (evt.metaKey || evt.ctrlKey)) {
			// Ctrl/Cmd + Enter to confirm
			evt.preventDefault();
			this.confirmSelection();
		}
	};

	private toggleCurrentSelection(): void {
		// Get the currently focused suggestion element
		const focusedEl = this.modalEl.querySelector(
			".suggestion-item.is-selected"
		);
		if (!focusedEl) return;

		// Get the current item from DOM
		const items = this.getItems();
		const index = Array.from(
			this.modalEl.querySelectorAll(".suggestion-item")
		).indexOf(focusedEl);
		const currentItem = items[index];
		if (!currentItem) return;

		const blockId = currentItem.highlight.blockId || "";
		const isCurrentlyChecked = this.selected.has(blockId);

		// Toggle the selection state
		if (isCurrentlyChecked) {
			this.selected.delete(blockId);
		} else {
			this.selected.add(blockId);
		}

		// Update the DOM directly without re-rendering
		const checkboxEl = focusedEl.querySelector<HTMLInputElement>(
			".task-list-item-checkbox"
		);

		if (checkboxEl) {
			// Toggle the is-checked class on focusedEl
			if (isCurrentlyChecked) {
				focusedEl.removeClass("is-checked");
				checkboxEl.checked = false;
			} else {
				focusedEl.addClass("is-checked");
				checkboxEl.checked = true;
			}
		}
	}

	private confirmSelection(): void {
		const selectedHighlights = this.highlights.filter((h) =>
			this.selected.has(h.blockId || "")
		);

		if (selectedHighlights.length === 0) {
			return;
		}

		this.onChoose(selectedHighlights);
		this.close();
	}
}
