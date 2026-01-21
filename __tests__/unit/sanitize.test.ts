import {
    sanitizeHtml,
    decodeHtmlEntities,
    stripHtmlTags,
    sanitizeForDB,
    sanitizeUrl,
    sanitizeFilename,
    sanitizeEmail,
    sanitizePhone,
    sanitizeControlChars,
    sanitizeInput,
    containsXSSPatterns,
    containsSQLInjectionPatterns,
} from '@/lib/security/sanitize'

describe('Security Sanitization', () => {
    describe('sanitizeHtml', () => {
        it('encodes < and > characters', () => {
            expect(sanitizeHtml('<script>')).toBe('&lt;script&gt;')
        })

        it('encodes quotes', () => {
            expect(sanitizeHtml('"test"')).toBe('&quot;test&quot;')
            expect(sanitizeHtml("'test'")).toBe('&#x27;test&#x27;')
        })

        it('encodes ampersand', () => {
            expect(sanitizeHtml('a & b')).toBe('a &amp; b')
        })

        it('handles empty input', () => {
            expect(sanitizeHtml('')).toBe('')
            expect(sanitizeHtml(null as unknown as string)).toBe('')
        })

        it('encodes backticks and equals', () => {
            expect(sanitizeHtml('`test`')).toBe('&#x60;test&#x60;')
            expect(sanitizeHtml('a=b')).toBe('a&#x3D;b')
        })
    })

    describe('decodeHtmlEntities', () => {
        it('decodes HTML entities back to characters', () => {
            expect(decodeHtmlEntities('&lt;script&gt;')).toBe('<script>')
            expect(decodeHtmlEntities('&amp;')).toBe('&')
        })

        it('handles empty input', () => {
            expect(decodeHtmlEntities('')).toBe('')
        })
    })

    describe('stripHtmlTags', () => {
        it('removes all HTML tags', () => {
            expect(stripHtmlTags('<p>Hello</p>')).toBe('Hello')
            expect(stripHtmlTags('<script>alert("xss")</script>')).toBe('alert("xss")')
        })

        it('handles self-closing tags', () => {
            expect(stripHtmlTags('Hello<br/>World')).toBe('HelloWorld')
        })

        it('removes &nbsp;', () => {
            expect(stripHtmlTags('Hello&nbsp;World')).toBe('Hello World')
        })
    })

    describe('sanitizeForDB', () => {
        it('escapes single quotes', () => {
            expect(sanitizeForDB("O'Brien")).toBe("O''Brien")
        })

        it('removes null bytes', () => {
            expect(sanitizeForDB('test\x00value')).toBe('testvalue')
        })

        it('escapes backslashes', () => {
            expect(sanitizeForDB('path\\to\\file')).toBe('path\\\\to\\\\file')
        })

        it('handles empty input', () => {
            expect(sanitizeForDB('')).toBe('')
        })
    })

    describe('sanitizeUrl', () => {
        it('blocks javascript: protocol', () => {
            expect(sanitizeUrl('javascript:alert(1)')).toBe('')
            expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('')
        })

        it('blocks data: protocol', () => {
            expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('')
        })

        it('allows https URLs', () => {
            expect(sanitizeUrl('https://example.com')).toBe('https://example.com')
        })

        it('allows http URLs', () => {
            expect(sanitizeUrl('http://example.com')).toBe('http://example.com')
        })

        it('allows relative URLs', () => {
            expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page')
        })

        it('allows anchor links', () => {
            expect(sanitizeUrl('#section')).toBe('#section')
        })

        it('allows mailto links', () => {
            expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com')
        })

        it('allows tel links', () => {
            expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890')
        })

        it('handles empty input', () => {
            expect(sanitizeUrl('')).toBe('')
        })
    })

    describe('sanitizeFilename', () => {
        it('removes path traversal', () => {
            expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd')
        })

        it('removes special characters', () => {
            expect(sanitizeFilename('file<>:"|?*.txt')).toBe('file.txt')
        })

        it('removes leading dots', () => {
            expect(sanitizeFilename('.hidden')).toBe('hidden')
        })

        it('limits length to 255 characters', () => {
            const longName = 'a'.repeat(300)
            expect(sanitizeFilename(longName).length).toBe(255)
        })

        it('returns "file" for empty input', () => {
            expect(sanitizeFilename('')).toBe('file')
        })
    })

    describe('sanitizeEmail', () => {
        it('accepts valid email', () => {
            expect(sanitizeEmail('test@example.com')).toBe('test@example.com')
        })

        it('converts to lowercase', () => {
            expect(sanitizeEmail('Test@EXAMPLE.com')).toBe('test@example.com')
        })

        it('rejects invalid email', () => {
            expect(sanitizeEmail('not-an-email')).toBe('')
            expect(sanitizeEmail('missing@')).toBe('')
        })

        it('trims whitespace', () => {
            expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com')
        })
    })

    describe('sanitizePhone', () => {
        it('keeps digits and allowed characters', () => {
            expect(sanitizePhone('+1 (555) 123-4567')).toBe('+1 (555) 123-4567')
        })

        it('removes letters and special chars', () => {
            expect(sanitizePhone('call me at 555-1234!')).toBe('555-1234')
        })

        it('handles empty input', () => {
            expect(sanitizePhone('')).toBe('')
        })
    })

    describe('sanitizeControlChars', () => {
        it('removes null bytes', () => {
            expect(sanitizeControlChars('test\x00value')).toBe('testvalue')
        })

        it('keeps newlines and tabs', () => {
            expect(sanitizeControlChars('line1\nline2\ttab')).toBe('line1\nline2\ttab')
        })

        it('removes other control characters', () => {
            expect(sanitizeControlChars('test\x01\x02\x03value')).toBe('testvalue')
        })
    })

    describe('sanitizeInput', () => {
        it('applies multiple sanitization layers', () => {
            const result = sanitizeInput('<script>alert("xss")</script>')
            expect(result).not.toContain('<script>')
        })

        it('limits length when specified', () => {
            const result = sanitizeInput('a'.repeat(100), { maxLength: 50 })
            expect(result.length).toBe(50)
        })

        it('removes newlines by default', () => {
            const result = sanitizeInput('line1\nline2')
            expect(result).not.toContain('\n')
        })

        it('keeps newlines when allowed', () => {
            const result = sanitizeInput('line1\nline2', { allowNewlines: true })
            expect(result).toContain('\n')
        })
    })

    describe('containsXSSPatterns', () => {
        it('detects script tags', () => {
            expect(containsXSSPatterns('<script>alert(1)</script>')).toBe(true)
        })

        it('detects javascript: protocol', () => {
            expect(containsXSSPatterns('javascript:alert(1)')).toBe(true)
        })

        it('detects event handlers', () => {
            expect(containsXSSPatterns('<img onerror="alert(1)">')).toBe(true)
            expect(containsXSSPatterns('<div onclick="alert(1)">')).toBe(true)
        })

        it('detects iframe tags', () => {
            expect(containsXSSPatterns('<iframe src="evil.com"></iframe>')).toBe(true)
        })

        it('returns false for safe input', () => {
            expect(containsXSSPatterns('Hello, World!')).toBe(false)
            expect(containsXSSPatterns('Normal text content')).toBe(false)
        })

        it('handles empty input', () => {
            expect(containsXSSPatterns('')).toBe(false)
            expect(containsXSSPatterns(null as unknown as string)).toBe(false)
        })
    })

    describe('containsSQLInjectionPatterns', () => {
        it('detects SQL keywords', () => {
            expect(containsSQLInjectionPatterns('SELECT * FROM users')).toBe(true)
            expect(containsSQLInjectionPatterns('DROP TABLE users')).toBe(true)
        })

        it('detects SQL comments', () => {
            expect(containsSQLInjectionPatterns("admin'-- ")).toBe(true)
        })

        it('detects always-true conditions', () => {
            expect(containsSQLInjectionPatterns('1=1')).toBe(true)
        })

        it('detects stacked queries', () => {
            expect(containsSQLInjectionPatterns("; DELETE FROM users")).toBe(true)
        })

        it('returns false for safe input', () => {
            expect(containsSQLInjectionPatterns('John Smith')).toBe(false)
            expect(containsSQLInjectionPatterns('test@example.com')).toBe(false)
        })
    })
})
