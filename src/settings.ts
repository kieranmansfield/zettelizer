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
