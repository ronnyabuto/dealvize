/**
 * Security Sanitization Utilities
 * Provides input sanitization for XSS, SQL injection, and other security concerns
 */

/**
 * HTML entity encoding to prevent XSS
 * Converts potentially dangerous characters to HTML entities
 */
export function sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') return ''

    const htmlEntities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    }

    return input.replace(/[&<>"'`=/]/g, char => htmlEntities[char] || char)
}

/**
 * Decode HTML entities back to characters
 * Useful when displaying previously sanitized content in safe contexts
 */
export function decodeHtmlEntities(input: string): string {
    if (!input || typeof input !== 'string') return ''

    const htmlDecodes: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#x27;': "'",
        '&#x2F;': '/',
        '&#x60;': '`',
        '&#x3D;': '='
    }

    return input.replace(/&(amp|lt|gt|quot|#x27|#x2F|#x60|#x3D);/g,
        entity => htmlDecodes[entity] || entity
    )
}

/**
 * Strip all HTML tags from input
 * Use when only plain text is acceptable
 */
export function stripHtmlTags(input: string): string {
    if (!input || typeof input !== 'string') return ''

    return input
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim()
}

/**
 * Sanitize for database storage
 * Note: Supabase uses parameterized queries, but this adds defense-in-depth
 */
export function sanitizeForDB(input: string): string {
    if (!input || typeof input !== 'string') return ''

    return input
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "''")
        .replace(/"/g, '\\"')
        .replace(/\x00/g, '')  // Remove null bytes
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\x1a/g, '\\Z')  // Remove EOF character
}

/**
 * Sanitize URL to prevent javascript: and data: attacks
 */
export function sanitizeUrl(input: string): string {
    if (!input || typeof input !== 'string') return ''

    const trimmed = input.trim().toLowerCase()

    // Block dangerous protocols
    const dangerousProtocols = [
        'javascript:',
        'data:',
        'vbscript:',
        'file:',
    ]

    for (const protocol of dangerousProtocols) {
        if (trimmed.startsWith(protocol)) {
            return ''
        }
    }

    // Only allow http(s) and relative URLs
    if (trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('/') ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('mailto:') ||
        trimmed.startsWith('tel:')) {
        return input.trim()
    }

    // For other URLs, assume relative and prepend with /
    if (!trimmed.includes(':')) {
        return input.trim()
    }

    return ''
}

/**
 * Sanitize filename to prevent path traversal and special character attacks
 */
export function sanitizeFilename(input: string): string {
    if (!input || typeof input !== 'string') return 'file'

    return input
        .replace(/\.\./g, '')  // Remove path traversal
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')  // Remove unsafe chars
        .replace(/^\.+/, '')  // Remove leading dots
        .replace(/\.+$/, '')  // Remove trailing dots
        .trim()
        .slice(0, 255) || 'file'  // Limit length
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(input: string): string {
    if (!input || typeof input !== 'string') return ''

    const cleaned = input.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    return emailRegex.test(cleaned) ? cleaned : ''
}

/**
 * Sanitize phone number - keep only digits, + and spaces
 */
export function sanitizePhone(input: string): string {
    if (!input || typeof input !== 'string') return ''

    return input.replace(/[^\d\s+\-()]/g, '').trim()
}

/**
 * Remove control characters and null bytes
 */
export function sanitizeControlChars(input: string): string {
    if (!input || typeof input !== 'string') return ''

    // Remove control characters except newline, tab, carriage return
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

/**
 * General-purpose input sanitizer
 * Applies multiple sanitization layers
 */
export function sanitizeInput(input: string, options: {
    allowHtml?: boolean
    allowNewlines?: boolean
    maxLength?: number
} = {}): string {
    if (!input || typeof input !== 'string') return ''

    let result = input

    // Remove control characters
    result = sanitizeControlChars(result)

    // Remove or encode HTML
    if (!options.allowHtml) {
        result = sanitizeHtml(result)
    }

    // Handle newlines
    if (!options.allowNewlines) {
        result = result.replace(/[\r\n]/g, ' ')
    }

    // Trim and limit length
    result = result.trim()

    if (options.maxLength && result.length > options.maxLength) {
        result = result.slice(0, options.maxLength)
    }

    return result
}

/**
 * Check if string contains potential XSS patterns
 */
export function containsXSSPatterns(input: string): boolean {
    if (!input || typeof input !== 'string') return false

    const xssPatterns = [
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,  // onclick=, onerror=, etc.
        /<iframe[\s\S]*?>/gi,
        /<object[\s\S]*?>/gi,
        /<embed[\s\S]*?>/gi,
        /<link[\s\S]*?>/gi,
        /expression\s*\(/gi,  // CSS expression
        /url\s*\(\s*['"]*\s*javascript:/gi,
    ]

    return xssPatterns.some(pattern => pattern.test(input))
}

/**
 * Check if string contains potential SQL injection patterns
 */
export function containsSQLInjectionPatterns(input: string): boolean {
    if (!input || typeof input !== 'string') return false

    const sqlPatterns = [
        /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|UNION|OR|AND)\s/gi,
        /--\s/g,  // SQL comment
        /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP)/gi,  // Stacked queries
        /'(\s|$)/g,  // Trailing single quote
        /1\s*=\s*1/gi,  // Always true condition
        /\bOR\b.*?\bOR\b/gi,  // Multiple OR conditions
    ]

    return sqlPatterns.some(pattern => pattern.test(input))
}
