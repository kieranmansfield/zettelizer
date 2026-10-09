import type { Highlight } from '../types'

/** A note as the intake module sees it: no Obsidian types leak across the seam. */
export interface NoteRef {
	path: string
	basename: string
}

export interface TitledNote {
	note: NoteRef
	/** Frontmatter title. */
	title: string
}

export interface TagMatch {
	note: NoteRef
	matchPercentage: number
	matchingTags: string[]
}

export type Destination = 'new' | NoteRef

export interface VaultPort {
	exists(path: string): Promise<boolean>
	create(path: string, content: string): Promise<void>
	read(note: NoteRef): Promise<string>
	modify(note: NoteRef, content: string): Promise<void>
	/** Template text, or null if no file lives at `path`. */
	readTemplate(path: string): Promise<string | null>
	/** Markdown notes that have a non-empty frontmatter title. */
	notesWithTitles(): TitledNote[]
}

/** Everything the user sees or answers. Prompts resolve null when the user cancels. */
export interface UiPort {
	selectHighlights(highlights: Highlight[]): Promise<Highlight[] | null>
	chooseDestination(highlight: Highlight, matches: TagMatch[]): Promise<Destination | null>
	notify(message: string): void
	open(note: NoteRef): Promise<void>
}

export interface IntakeSettings {
	zettelFolder: string
	templatePath: string
	autoOpenAppendedNotes: boolean
}

export interface IntakeDeps {
	vault: VaultPort
	ui: UiPort
	settings: IntakeSettings
}

export type Mode = 'plain' | 'smart'
