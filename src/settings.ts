import { DEFAULT_FILENAME_TEMPLATE, DEFAULT_HIGHLIGHT_TEMPLATE, DEFAULT_NOTE_TEMPLATE } from './readwise/render'

export interface ZettelizerSettings {
	readwiseFolder: string
	zettelFolder: string
	timestampFormat: string
	truncateLength: number
	templatePath: string
	autoOpenAppendedNotes: boolean
	/** Name of the SecretStorage entry holding the Readwise token. */
	readwiseTokenSecret: string
	skipExisting: boolean
	syncOnStartup: boolean
	/** Start as the built-in default so there is something to edit; emptied, they fall back to it again. */
	readwiseNoteTemplate: string
	readwiseHighlightTemplate: string
	readwiseFilenameTemplate: string
	/** Whether `private://` source URLs (uploaded Reader documents) are written to `sources`. */
	readwisePrivateSources: boolean
}

export const DEFAULT_SETTINGS: ZettelizerSettings = {
	readwiseFolder: 'Readwise',
	zettelFolder: 'Zettelkasten',
	timestampFormat: 'YYYYMMDDHHmmssSSS',
	truncateLength: 100,
	templatePath: '',
	autoOpenAppendedNotes: true,
	readwiseTokenSecret: '',
	skipExisting: true,
	syncOnStartup: true,
	readwiseNoteTemplate: DEFAULT_NOTE_TEMPLATE,
	readwiseHighlightTemplate: DEFAULT_HIGHLIGHT_TEMPLATE,
	readwiseFilenameTemplate: DEFAULT_FILENAME_TEMPLATE,
	readwisePrivateSources: true,
}

const TEMPLATE_KEYS = ['readwiseNoteTemplate', 'readwiseHighlightTemplate', 'readwiseFilenameTemplate'] as const

/** Earlier versions saved empty templates; show the default in the editor instead of an empty box. */
export function fillEmptyTemplates(settings: ZettelizerSettings): void {
	for (const key of TEMPLATE_KEYS) settings[key] ||= DEFAULT_SETTINGS[key]
}

const LEGACY_SECRET_ID = 'zettelizer-readwise-token'

/**
 * Moves a plaintext `readwiseToken` from an older data.json into secret storage and drops it from
 * `settings`. Returns whether anything changed, i.e. whether the settings need saving.
 */
export function migrateLegacyToken(
	settings: ZettelizerSettings,
	secrets: { setSecret(id: string, secret: string): void }
): boolean {
	const loose = settings as unknown as Record<string, unknown>
	const legacy = loose.readwiseToken
	if (typeof legacy !== 'string') return false
	if (legacy && !settings.readwiseTokenSecret) {
		secrets.setSecret(LEGACY_SECRET_ID, legacy)
		settings.readwiseTokenSecret = LEGACY_SECRET_ID
	}
	delete loose.readwiseToken
	return true
}
