import {
    clientSchema,
    dealSchema,
    taskSchema,
    userProfileSchema,
    userPreferencesSchema,
    commissionSettingsSchema,
} from '@/lib/validations'

describe('Validation Schemas', () => {
    describe('clientSchema', () => {
        const validClient = {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+14155551234',
            address: '123 Main Street, City, State 12345',
            company: 'Acme Corp',
            status: 'Buyer' as const,
            dealValue: '$500,000',
        }

        it('validates a valid client', () => {
            const result = clientSchema.safeParse(validClient)
            expect(result.success).toBe(true)
        })

        it('rejects empty name', () => {
            const result = clientSchema.safeParse({ ...validClient, name: '' })
            expect(result.success).toBe(false)
        })

        it('rejects name shorter than 2 characters', () => {
            const result = clientSchema.safeParse({ ...validClient, name: 'A' })
            expect(result.success).toBe(false)
        })

        it('rejects invalid email format', () => {
            const result = clientSchema.safeParse({ ...validClient, email: 'invalid' })
            expect(result.success).toBe(false)
        })

        it('rejects invalid phone format', () => {
            const result = clientSchema.safeParse({ ...validClient, phone: 'abc' })
            expect(result.success).toBe(false)
        })

        it('rejects short address', () => {
            const result = clientSchema.safeParse({ ...validClient, address: '123' })
            expect(result.success).toBe(false)
        })

        it('accepts valid status values', () => {
            const statuses = ['Buyer', 'Seller', 'In Contract'] as const
            statuses.forEach((status) => {
                const result = clientSchema.safeParse({ ...validClient, status })
                expect(result.success).toBe(true)
            })
        })

        it('rejects invalid status', () => {
            const result = clientSchema.safeParse({ ...validClient, status: 'Invalid' })
            expect(result.success).toBe(false)
        })

        it('transforms deal value to numeric string', () => {
            const result = clientSchema.parse({ ...validClient, dealValue: '$1,500,000' })
            expect(result.dealValue).toBe('1500000')
        })

        it('allows empty company', () => {
            const result = clientSchema.safeParse({ ...validClient, company: '' })
            expect(result.success).toBe(true)
        })
    })

    describe('dealSchema', () => {
        const validDeal = {
            title: 'Luxury Home Sale',
            clientId: 'client-123',
            value: '$750,000',
            status: 'In Progress' as const,
            probability: 75,
            expectedCloseDate: '2026-03-15',
            commissionPercentage: 2.5,
            property: {
                address: '456 Ocean View Drive, Miami, FL 33101',
                type: 'Single Family',
                bedrooms: 4,
                bathrooms: 3,
                sqft: 2500,
            },
        }

        it('validates a valid deal', () => {
            const result = dealSchema.safeParse(validDeal)
            expect(result.success).toBe(true)
        })

        it('rejects empty title', () => {
            const result = dealSchema.safeParse({ ...validDeal, title: '' })
            expect(result.success).toBe(false)
        })

        it('rejects title shorter than 3 characters', () => {
            const result = dealSchema.safeParse({ ...validDeal, title: 'AB' })
            expect(result.success).toBe(false)
        })

        it('rejects missing clientId', () => {
            const result = dealSchema.safeParse({ ...validDeal, clientId: '' })
            expect(result.success).toBe(false)
        })

        it('rejects zero value', () => {
            const result = dealSchema.safeParse({ ...validDeal, value: '$0' })
            expect(result.success).toBe(false)
        })

        it('accepts all valid status values', () => {
            const statuses = ['Lead', 'In Progress', 'Under Contract', 'Closed', 'Lost'] as const
            statuses.forEach((status) => {
                const result = dealSchema.safeParse({ ...validDeal, status })
                expect(result.success).toBe(true)
            })
        })

        it('rejects probability below 0', () => {
            const result = dealSchema.safeParse({ ...validDeal, probability: -10 })
            expect(result.success).toBe(false)
        })

        it('rejects probability above 100', () => {
            const result = dealSchema.safeParse({ ...validDeal, probability: 150 })
            expect(result.success).toBe(false)
        })

        it('rejects invalid date format', () => {
            const result = dealSchema.safeParse({ ...validDeal, expectedCloseDate: 'invalid' })
            expect(result.success).toBe(false)
        })

        it('rejects commission percentage above 50', () => {
            const result = dealSchema.safeParse({ ...validDeal, commissionPercentage: 60 })
            expect(result.success).toBe(false)
        })

        it('validates property details', () => {
            const result = dealSchema.safeParse({
                ...validDeal,
                property: {
                    ...validDeal.property,
                    bedrooms: 21,
                },
            })
            expect(result.success).toBe(false)
        })
    })

    describe('taskSchema', () => {
        const validTask = {
            title: 'Follow up with client',
            description: 'Call to discuss property options',
            dueDate: '2026-02-01',
            priority: 'High' as const,
            type: 'Call' as const,
            clientId: 'client-123',
            dealId: 'deal-456',
        }

        it('validates a valid task', () => {
            const result = taskSchema.safeParse(validTask)
            expect(result.success).toBe(true)
        })

        it('rejects empty title', () => {
            const result = taskSchema.safeParse({ ...validTask, title: '' })
            expect(result.success).toBe(false)
        })

        it('rejects short title', () => {
            const result = taskSchema.safeParse({ ...validTask, title: 'AB' })
            expect(result.success).toBe(false)
        })

        it('accepts all valid priority values', () => {
            const priorities = ['Low', 'Medium', 'High'] as const
            priorities.forEach((priority) => {
                const result = taskSchema.safeParse({ ...validTask, priority })
                expect(result.success).toBe(true)
            })
        })

        it('accepts all valid type values', () => {
            const types = ['Call', 'Email', 'Meeting', 'Document', 'Follow-up', 'Other'] as const
            types.forEach((type) => {
                const result = taskSchema.safeParse({ ...validTask, type })
                expect(result.success).toBe(true)
            })
        })

        it('allows optional description', () => {
            const { description, ...taskWithoutDesc } = validTask
            const result = taskSchema.safeParse(taskWithoutDesc)
            expect(result.success).toBe(true)
        })

        it('allows optional clientId and dealId', () => {
            const { clientId, dealId, ...baseTask } = validTask
            const result = taskSchema.safeParse(baseTask)
            expect(result.success).toBe(true)
        })
    })

    describe('userProfileSchema', () => {
        const validProfile = {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            phone: '+14155559999',
            licenseNumber: 'RE12345678',
        }

        it('validates a valid profile', () => {
            const result = userProfileSchema.safeParse(validProfile)
            expect(result.success).toBe(true)
        })

        it('rejects first name with numbers', () => {
            const result = userProfileSchema.safeParse({ ...validProfile, firstName: 'Jane123' })
            expect(result.success).toBe(false)
        })

        it('rejects short first name', () => {
            const result = userProfileSchema.safeParse({ ...validProfile, firstName: 'J' })
            expect(result.success).toBe(false)
        })

        it('allows optional license number', () => {
            const { licenseNumber, ...profileWithoutLicense } = validProfile
            const result = userProfileSchema.safeParse(profileWithoutLicense)
            expect(result.success).toBe(true)
        })

        it('rejects license number shorter than 5 characters', () => {
            const result = userProfileSchema.safeParse({ ...validProfile, licenseNumber: '1234' })
            expect(result.success).toBe(false)
        })
    })

    describe('userPreferencesSchema', () => {
        const validPrefs = {
            timezone: 'America/New_York',
            dateFormat: 'MM/DD/YYYY' as const,
            timeFormat: '12h' as const,
            language: 'en',
            currency: 'USD',
            theme: 'dark' as const,
        }

        it('validates valid preferences', () => {
            const result = userPreferencesSchema.safeParse(validPrefs)
            expect(result.success).toBe(true)
        })

        it('accepts all date formats', () => {
            const formats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'] as const
            formats.forEach((dateFormat) => {
                const result = userPreferencesSchema.safeParse({ ...validPrefs, dateFormat })
                expect(result.success).toBe(true)
            })
        })

        it('accepts all time formats', () => {
            const formats = ['12h', '24h'] as const
            formats.forEach((timeFormat) => {
                const result = userPreferencesSchema.safeParse({ ...validPrefs, timeFormat })
                expect(result.success).toBe(true)
            })
        })

        it('accepts all theme values', () => {
            const themes = ['light', 'dark', 'system'] as const
            themes.forEach((theme) => {
                const result = userPreferencesSchema.safeParse({ ...validPrefs, theme })
                expect(result.success).toBe(true)
            })
        })

        it('rejects empty timezone', () => {
            const result = userPreferencesSchema.safeParse({ ...validPrefs, timezone: '' })
            expect(result.success).toBe(false)
        })
    })

    describe('commissionSettingsSchema', () => {
        it('validates valid commission settings', () => {
            const result = commissionSettingsSchema.safeParse({
                defaultCommission: 2.5,
                brokerSplit: 50,
            })
            expect(result.success).toBe(true)
        })

        it('rejects negative commission', () => {
            const result = commissionSettingsSchema.safeParse({
                defaultCommission: -1,
                brokerSplit: 50,
            })
            expect(result.success).toBe(false)
        })

        it('rejects commission above 50%', () => {
            const result = commissionSettingsSchema.safeParse({
                defaultCommission: 55,
                brokerSplit: 50,
            })
            expect(result.success).toBe(false)
        })

        it('rejects broker split above 100%', () => {
            const result = commissionSettingsSchema.safeParse({
                defaultCommission: 2.5,
                brokerSplit: 110,
            })
            expect(result.success).toBe(false)
        })
    })
})
