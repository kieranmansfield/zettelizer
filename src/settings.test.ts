import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, migrateLegacyToken } from './settings'

describe('migrateLegacyToken', () => {
	const run = (extra: Record<string, unknown>) => {
		const stored: Record<string, string> = {}
		const settings = { ...DEFAULT_SETTINGS, ...extra }
		const changed = migrateLegacyToken(settings, { setSecret: (id, s) => void (stored[id] = s) })
		return { changed, stored, settings: settings as Record<string, unknown> }
	}

	it('moves a plaintext token into secret storage and forgets it', () => {
		const r = run({ readwiseToken: 'abc' })
		expect(r.changed).toBe(true)
		expect(r.stored).toEqual({ 'zettelizer-readwise-token': 'abc' })
		expect(r.settings.readwiseTokenSecret).toBe('zettelizer-readwise-token')
		expect('readwiseToken' in r.settings).toBe(false)
	})

	it('does not overwrite a secret the user already chose', () => {
		const r = run({ readwiseToken: 'abc', readwiseTokenSecret: 'mine' })
		expect(r.stored).toEqual({})
		expect(r.settings.readwiseTokenSecret).toBe('mine')
	})

	it('does nothing when there is no legacy token', () => {
		expect(run({}).changed).toBe(false)
	})
})
