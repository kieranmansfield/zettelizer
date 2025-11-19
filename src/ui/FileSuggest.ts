import { App, TAbstractFile, TFile } from "obsidian";
import { TextInputSuggest } from "./TextInputSuggest";

export class FileSuggest extends TextInputSuggest<TFile> {
	constructor(
		public app: App,
		public inputEl: HTMLInputElement,
		private allowedExtensions: string[] = ["md"]
	) {
		super(app, inputEl);
	}

	getSuggestions(inputStr: string): TFile[] {
		const abstractFiles = this.app.vault.getAllLoadedFiles();
		const files: TFile[] = [];
		const lowerCaseInputStr = inputStr.toLowerCase();

		abstractFiles.forEach((file: TAbstractFile) => {
			if (
				file instanceof TFile &&
				this.allowedExtensions.includes(file.extension) &&
				file.path.toLowerCase().contains(lowerCaseInputStr)
			) {
				files.push(file);
			}
		});

		return files;
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.path);
	}

	selectSuggestion(file: TFile): void {
		this.inputEl.value = file.path;
		this.inputEl.trigger("input");
		this.close();
	}
}
