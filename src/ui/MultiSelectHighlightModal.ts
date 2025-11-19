import { App, Modal } from "obsidian";
import { Highlight } from "../types";

export class MultiSelectHighlightModal extends Modal {
	private highlights: Highlight[];
	private selected: Set<number>;
	private onChoose: (selected: Highlight[]) => void;
	private currentIdx: number;

	constructor(
		app: App,
		highlights: Highlight[],
		onChoose: (selected: Highlight[]) => void
	) {
		super(app);
		this.highlights = highlights;
		this.selected = new Set();
		this.onChoose = onChoose;
		this.currentIdx = 0;
	}

	onOpen() {
		this.render();
		this.modalEl.addEventListener("keydown", this.handleKeyDown);
	}

	onClose() {
		this.modalEl.removeEventListener("keydown", this.handleKeyDown);
		this.contentEl.empty();
	}

	private render() {
		const { contentEl } = this;
		contentEl.empty();
		const list = contentEl.createEl("ul", { cls: "multi-select-list" });
		this.highlights.forEach((highlight, idx) => {
			const item = list.createEl("li", { cls: "multi-select-item" });
			item.toggleClass("is-checked", this.selected.has(idx));
			item.toggleClass("is-active", idx === this.currentIdx);
			item.createEl("span", {
				text: this.selected.has(idx) ? "☑ " : "☐ ",
			});
			item.createEl("span", { text: highlight.text });
			item.addEventListener("click", () => {
				if (this.selected.has(idx)) {
					this.selected.delete(idx);
				} else {
					this.selected.add(idx);
				}
				this.currentIdx = idx;
				this.render();
			});
		});
	}

	private handleKeyDown = (evt: KeyboardEvent) => {
		if (evt.key === "ArrowDown") {
			evt.preventDefault();
			this.currentIdx = (this.currentIdx + 1) % this.highlights.length;
			this.render();
		} else if (evt.key === "ArrowUp") {
			evt.preventDefault();
			this.currentIdx =
				(this.currentIdx - 1 + this.highlights.length) %
				this.highlights.length;
			this.render();
		} else if (evt.key === " ") {
			evt.preventDefault();
			if (this.selected.has(this.currentIdx)) {
				this.selected.delete(this.currentIdx);
			} else {
				this.selected.add(this.currentIdx);
			}
			this.render();
		} else if (evt.key === "Enter") {
			evt.preventDefault();
			const selectedHighlights = Array.from(this.selected).map(
				(i) => this.highlights[i]
			);
			this.onChoose(selectedHighlights);
			this.close();
		}
	};
}
