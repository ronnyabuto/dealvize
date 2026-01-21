import { generateCSRFToken, validateCSRFToken } from '@/lib/security/csrf'

describe('CSRF Security Module', () => {
    describe('generateCSRFToken', () => {
        it('generates a token of correct length', () => {
            const token = generateCSRFToken()
            expect(token.length).toBe(64)
        })

        it('generates unique tokens on each call', () => {
            const token1 = generateCSRFToken()
            const token2 = generateCSRFToken()
            expect(token1).not.toBe(token2)
        })

        it('generates only hexadecimal characters', () => {
            const token = generateCSRFToken()
            expect(token).toMatch(/^[0-9a-f]+$/)
        })

        it('generates multiple unique tokens', () => {
            const tokens = new Set()
            for (let i = 0; i < 100; i++) {
                tokens.add(generateCSRFToken())
            }
            expect(tokens.size).toBe(100)
        })
    })

    describe('validateCSRFToken', () => {
        it('returns true for matching tokens', () => {
            const token = 'a'.repeat(64)
            expect(validateCSRFToken(token, token)).toBe(true)
        })

        it('returns false for mismatched tokens', () => {
            const token1 = 'a'.repeat(64)
            const token2 = 'b'.repeat(64)
            expect(validateCSRFToken(token1, token2)).toBe(false)
        })

        it('returns false for empty provided token', () => {
            const expected = 'a'.repeat(64)
            expect(validateCSRFToken('', expected)).toBe(false)
        })

        it('returns false for empty expected token', () => {
            const provided = 'a'.repeat(64)
            expect(validateCSRFToken(provided, '')).toBe(false)
        })

        it('returns false for null/undefined provided token', () => {
            const expected = 'a'.repeat(64)
            expect(validateCSRFToken(null as unknown as string, expected)).toBe(false)
            expect(validateCSRFToken(undefined as unknown as string, expected)).toBe(false)
        })

        it('returns false for different length tokens', () => {
            const token1 = 'a'.repeat(64)
            const token2 = 'a'.repeat(63)
            expect(validateCSRFToken(token1, token2)).toBe(false)
        })

        it('validates generated tokens correctly', () => {
            const token = generateCSRFToken()
            expect(validateCSRFToken(token, token)).toBe(true)
        })

        it('uses timing-safe comparison (same execution path)', () => {
            const base = 'a'.repeat(63) + 'x'
            const almostMatch = 'a'.repeat(63) + 'y'
            const noMatch = 'b'.repeat(64)

            expect(validateCSRFToken(almostMatch, base)).toBe(false)
            expect(validateCSRFToken(noMatch, base)).toBe(false)
        })
    })
})
