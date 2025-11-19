import { Plugin } from "obsidian";
import { ZettelizerSettings, DEFAULT_SETTINGS } from "./settings";
import { registerCommands } from "./commands/commands";
import { ZettelizerSettingTab } from "./ui/SettingsTab";

export default class ZettelizerPlugin extends Plugin {
	settings: ZettelizerSettings;

	async onload() {
		await this.loadSettings();

		// Register all commands
		registerCommands(this);

		// Register settings tab
		this.addSettingTab(new ZettelizerSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
