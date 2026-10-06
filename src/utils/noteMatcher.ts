import { App, TFile } from 'obsidian'

export interface MatchedNote {
	file: TFile
	matchPercentage: number
	matchingTags: string[]
}

function getNormalizedTitle(app: App, file: TFile): string | null {
	const title: unknown = app.metadataCache.getFileCache(file)?.frontmatter?.title
	return typeof title === 'string' && title ? title.toLowerCase().trim() : null
}

function tagMatchesTitle(tag: string, title: string): boolean {
	return title.includes(tag) || tag.includes(title)
}

function matchNote(app: App, file: TFile, tags: string[]): MatchedNote | null {
	const title = getNormalizedTitle(app, file);
	if (!title) return null;

	const matchingTags = tags.filter((tag) => tagMatchesTitle(tag, title));
	if (matchingTags.length === 0) return null;

	return { file, matchPercentage: (matchingTags.length / tags.length) * 100, matchingTags };
}

/**
 * Finds notes where the title (from frontmatter) matches any of the provided tags
 * @param app Obsidian app instance
 * @param tags Array of tags to match against (should be lowercase)
 * @returns Array of matched notes sorted by match percentage (highest first)
 */
export function findMatchingNotes(app: App, tags: string[]): MatchedNote[] {
	return app.vault
		.getMarkdownFiles()
		.flatMap((file) => matchNote(app, file, tags) ?? [])
		.sort((a, b) => b.matchPercentage - a.matchPercentage);
}
