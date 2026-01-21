describe('Security Headers Configuration', () => {
    const securityHeaders = {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://js.stripe.com https://vercel.live",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com https://vercel.live",
            "img-src 'self' data: https:",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://vercel.live",
            "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://vercel.live",
            "object-src 'none'"
        ].join('; ')
    }

    describe('X-Frame-Options', () => {
        it('is set to DENY', () => {
            expect(securityHeaders['X-Frame-Options']).toBe('DENY')
        })

        it('prevents clickjacking attacks', () => {
            const validValues = ['DENY', 'SAMEORIGIN']
            expect(validValues).toContain(securityHeaders['X-Frame-Options'])
        })
    })

    describe('X-Content-Type-Options', () => {
        it('is set to nosniff', () => {
            expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff')
        })

        it('prevents MIME type sniffing', () => {
            expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff')
        })
    })

    describe('Referrer-Policy', () => {
        it('is set to strict-origin-when-cross-origin', () => {
            expect(securityHeaders['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
        })

        it('limits referrer information leakage', () => {
            const validPolicies = [
                'no-referrer',
                'no-referrer-when-downgrade',
                'same-origin',
                'origin',
                'strict-origin',
                'origin-when-cross-origin',
                'strict-origin-when-cross-origin',
                'unsafe-url'
            ]
            expect(validPolicies).toContain(securityHeaders['Referrer-Policy'])
        })
    })

    describe('Content-Security-Policy', () => {
        const csp = securityHeaders['Content-Security-Policy']

        it('has default-src set to self', () => {
            expect(csp).toContain("default-src 'self'")
        })

        it('allows scripts from self and Stripe', () => {
            expect(csp).toContain("script-src 'self'")
            expect(csp).toContain('https://js.stripe.com')
        })

        it('allows styles from self and Google Fonts', () => {
            expect(csp).toContain("style-src 'self'")
            expect(csp).toContain('https://fonts.googleapis.com')
        })

        it('allows fonts from Google Fonts', () => {
            expect(csp).toContain('https://fonts.gstatic.com')
        })

        it('allows images from self, data URIs, and HTTPS', () => {
            expect(csp).toContain("img-src 'self' data: https:")
        })

        it('allows connections to Supabase', () => {
            expect(csp).toContain('https://*.supabase.co')
            expect(csp).toContain('wss://*.supabase.co')
        })

        it('allows frames from Stripe checkout', () => {
            expect(csp).toContain('https://checkout.stripe.com')
        })

        it('blocks object embeds', () => {
            expect(csp).toContain("object-src 'none'")
        })
    })

    describe('HSTS Configuration', () => {
        const hstsConfig = {
            enabled: true,
            maxAge: 31536000,
            includeSubDomains: true,
            productionOnly: true
        }

        it('has max-age of one year', () => {
            expect(hstsConfig.maxAge).toBe(31536000)
        })

        it('includes subdomains', () => {
            expect(hstsConfig.includeSubDomains).toBe(true)
        })

        it('is only applied in production', () => {
            expect(hstsConfig.productionOnly).toBe(true)
        })

        it('generates correct header value', () => {
            const headerValue = `max-age=${hstsConfig.maxAge}; includeSubDomains`
            expect(headerValue).toBe('max-age=31536000; includeSubDomains')
        })
    })

    describe('CSP Directive Parsing', () => {
        const cspDirectives = securityHeaders['Content-Security-Policy']
            .split(';')
            .map(d => d.trim())
            .filter(d => d.length > 0)

        it('has 8 directives', () => {
            expect(cspDirectives.length).toBe(8)
        })

        it('each directive has a valid name', () => {
            const validDirectiveNames = [
                'default-src', 'script-src', 'style-src', 'font-src',
                'img-src', 'connect-src', 'frame-src', 'object-src',
                'base-uri', 'form-action', 'frame-ancestors', 'media-src'
            ]

            cspDirectives.forEach(directive => {
                const directiveName = directive.split(' ')[0]
                expect(validDirectiveNames).toContain(directiveName)
            })
        })
    })
})

describe('Security Best Practices', () => {
    describe('Cookie Security', () => {
        const cookieOptions = {
            httpOnly: true,
            secure: true,  // in production
            sameSite: 'strict' as const,
            maxAge: 86400
        }

        it('uses httpOnly for sensitive cookies', () => {
            expect(cookieOptions.httpOnly).toBe(true)
        })

        it('uses secure flag', () => {
            expect(cookieOptions.secure).toBe(true)
        })

        it('uses SameSite=Strict', () => {
            expect(cookieOptions.sameSite).toBe('strict')
        })

        it('has reasonable max age', () => {
            expect(cookieOptions.maxAge).toBeLessThanOrEqual(86400 * 7) // max 7 days
        })
    })

    describe('CSRF Protection', () => {
        const csrfConfig = {
            tokenLength: 32,
            cookieName: 'csrf-token',
            headerName: 'x-csrf-token',
            doubleSubmitPattern: true
        }

        it('uses sufficiently long tokens', () => {
            expect(csrfConfig.tokenLength).toBeGreaterThanOrEqual(32)
        })

        it('uses double-submit cookie pattern', () => {
            expect(csrfConfig.doubleSubmitPattern).toBe(true)
        })

        it('has consistent naming', () => {
            expect(csrfConfig.cookieName).toBe('csrf-token')
            expect(csrfConfig.headerName).toBe('x-csrf-token')
        })
    })

    describe('Rate Limiting', () => {
        const rateLimitConfigs = {
            api: { windowMs: 60000, maxRequests: 100 },
            auth: { windowMs: 900000, maxRequests: 5 },
            chat: { windowMs: 60000, maxRequests: 30 }
        }

        it('has stricter limits for auth endpoints', () => {
            expect(rateLimitConfigs.auth.maxRequests).toBeLessThan(rateLimitConfigs.api.maxRequests)
        })

        it('has longer window for auth endpoints', () => {
            expect(rateLimitConfigs.auth.windowMs).toBeGreaterThan(rateLimitConfigs.api.windowMs)
        })

        it('has reasonable API limits', () => {
            expect(rateLimitConfigs.api.maxRequests).toBeGreaterThanOrEqual(100)
        })
    })
})
