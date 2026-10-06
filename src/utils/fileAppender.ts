import { App, TFile } from 'obsidian'

/**
 * Appends a highlight reference to an existing note
 * @param app Obsidian app instance
 * @param targetFile The file to append to
 * @param sourceFile The file containing the highlight
 * @param blockId The block ID of the highlight
 */
export async function appendHighlightToNote(
	app: App,
	targetFile: TFile,
	sourceFile: TFile,
	blockId: string
): Promise<void> {
	const vault = app.vault

	// Read the current content
	const currentContent = await vault.read(targetFile)

	// Create the link reference
	const sourceFileName = sourceFile.basename
	const linkReference = `![[${sourceFileName}#^${blockId}]]`

	// Build the new content
	let newContent = currentContent

	// Add separator and link
	if (newContent.length > 0 && !newContent.endsWith('\n')) {
		newContent += '\n'
	}
	newContent += `\n---\n${linkReference}\n`

	// Write back to file
	await vault.modify(targetFile, newContent)
}
