export interface ZettelizerSettings {
	readwiseFolder: string
	zettelFolder: string
	timestampFormat: string
	truncateLength: number
	templatePath: string
	autoOpenAppendedNotes: boolean
	readwiseToken: string
	skipExisting: boolean
}

export const DEFAULT_SETTINGS: ZettelizerSettings = {
	readwiseFolder: 'Readwise',
	zettelFolder: 'Zettelkasten',
	timestampFormat: 'YYYYMMDDHHmmssSSS',
	truncateLength: 100,
	templatePath: '',
	autoOpenAppendedNotes: true,
	readwiseToken: '',
	skipExisting: true,
}
