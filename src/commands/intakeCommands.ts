import { Notice } from 'obsidian'
import type ZettelizerPlugin from '../main'
import { intake } from '../intake/intake'
import { noteRef, obsidianUi, obsidianVault, ReadwiseFileModal } from '../intake/obsidian'
import type { Mode } from '../intake/ports'

export function registerIntakeCommands(plugin: ZettelizerPlugin) {
	const run = (file: Parameters<typeof noteRef>[0], mode: Mode) =>
		intake(noteRef(file), mode, {
			vault: obsidianVault(plugin.app),
			ui: obsidianUi(plugin),
			settings: plugin.settings,
		})

	const add = (activeId: string, activeName: string, pickerId: string, pickerName: string, mode: Mode) => {
		plugin.addCommand({
			id: activeId,
			name: activeName,
			callback: () => {
				const file = plugin.app.workspace.getActiveFile()
				if (!file) return void new Notice('No active file.')
				return run(file, mode)
			},
		})
		plugin.addCommand({
			id: pickerId,
			name: pickerName,
			callback: () => void new ReadwiseFileModal(plugin, (file) => void run(file, mode)).open(),
		})
	}

	add('zettelize-readwise-highlights', 'Zettelize Readwise highlights', 'open', 'Open file picker', 'plain')
	add('smart-match-readwise-highlights', 'Smart Match Readwise highlights', 'smart-match-open-file-picker', 'Smart Match: Open file picker', 'smart')
}
