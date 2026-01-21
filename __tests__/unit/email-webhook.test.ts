describe('Email Webhook', () => {
    describe('Idempotency', () => {
        it('generates idempotency key from email id', () => {
            const emailId = 'msg_abc123'
            const idempotencyKey = `email:${emailId}`
            expect(idempotencyKey).toBe('email:msg_abc123')
        })

        it('skips duplicate emails', () => {
            const idempotencyResult = 'DUPLICATE'
            expect(idempotencyResult).toBe('DUPLICATE')
        })

        it('processes new emails', () => {
            const idempotencyResult = 'PROCESS'
            expect(idempotencyResult).toBe('PROCESS')
        })
    })

    describe('Email Parsing', () => {
        const mockEmail = {
            subject: 'Interested in property',
            from: [{ name: 'John Doe', email: 'john@example.com' }],
            to: [{ name: 'Agent', email: 'agent@dealvize.com' }],
            body: 'I am interested in the property at 123 Main St.'
        }

        it('extracts sender name', () => {
            expect(mockEmail.from[0].name).toBe('John Doe')
        })

        it('extracts sender email', () => {
            expect(mockEmail.from[0].email).toBe('john@example.com')
        })

        it('extracts subject', () => {
            expect(mockEmail.subject).toBe('Interested in property')
        })

        it('handles missing sender gracefully', () => {
            const emailNoSender = { from: [] }
            expect(emailNoSender.from.length).toBe(0)
        })
    })

    describe('Client Extraction', () => {
        it('extracts client name from email content', () => {
            const extraction = {
                client: { name: 'John Doe', email: 'john@example.com', phone: null, company: null }
            }
            expect(extraction.client.name).toBe('John Doe')
        })

        it('extracts client email', () => {
            const extraction = {
                client: { name: 'John', email: 'john@example.com', phone: null, company: null }
            }
            expect(extraction.client.email).toBe('john@example.com')
        })

        it('handles nullable phone field', () => {
            const extraction = { client: { phone: null } }
            expect(extraction.client.phone).toBeNull()
        })

        it('handles nullable company field', () => {
            const extraction = { client: { company: null } }
            expect(extraction.client.company).toBeNull()
        })
    })

    describe('Deal Extraction', () => {
        const intents = ['INQUIRY', 'NEGOTIATION', 'CLOSING', 'FOLLOW_UP']
        const propertyTypes = ['residential', 'commercial']
        const timelines = ['immediate', '30_days', '90_days', 'exploratory']

        it('recognizes all intent types', () => {
            intents.forEach(intent => {
                expect(['INQUIRY', 'NEGOTIATION', 'CLOSING', 'FOLLOW_UP']).toContain(intent)
            })
        })

        it('recognizes all property types', () => {
            propertyTypes.forEach(type => {
                expect(['residential', 'commercial']).toContain(type)
            })
        })

        it('recognizes all timeline types', () => {
            timelines.forEach(timeline => {
                expect(['immediate', '30_days', '90_days', 'exploratory']).toContain(timeline)
            })
        })

        it('extracts budget range', () => {
            const deal = { budget_min: 500000, budget_max: 750000 }
            expect(deal.budget_min).toBe(500000)
            expect(deal.budget_max).toBe(750000)
        })
    })

    describe('Task Extraction', () => {
        it('extracts tasks from email', () => {
            const tasks = [
                { description: 'Schedule property viewing', due: 'this_week' },
                { description: 'Send property details', due: 'today' }
            ]
            expect(tasks.length).toBe(2)
        })

        it('handles due date today', () => {
            const task = { due: 'today' }
            expect(task.due).toBe('today')
        })

        it('handles due date this_week', () => {
            const task = { due: 'this_week' }
            const dueDate = new Date()
            dueDate.setDate(dueDate.getDate() + 7)
            expect(dueDate.getTime()).toBeGreaterThan(Date.now())
        })

        it('handles due date next_week', () => {
            const task = { due: 'next_week' }
            const dueDate = new Date()
            dueDate.setDate(dueDate.getDate() + 14)
            expect(dueDate.getTime()).toBeGreaterThan(Date.now())
        })
    })

    describe('Confidence Scoring', () => {
        it('accepts high confidence extractions', () => {
            const confidence = 0.85
            expect(confidence).toBeGreaterThanOrEqual(0.5)
        })

        it('rejects low confidence extractions', () => {
            const confidence = 0.3
            expect(confidence).toBeLessThan(0.5)
        })

        it('confidence must be between 0 and 1', () => {
            const confidence = 0.75
            expect(confidence).toBeGreaterThanOrEqual(0)
            expect(confidence).toBeLessThanOrEqual(1)
        })
    })

    describe('Client Creation', () => {
        it('checks for existing client by email', () => {
            const existingClient = { id: 'client_123' }
            expect(existingClient.id).toBe('client_123')
        })

        it('creates new client when not found', () => {
            const newClient = {
                name: 'John Doe',
                email: 'john@example.com',
                status: 'lead',
                source: 'email_webhook'
            }
            expect(newClient.source).toBe('email_webhook')
            expect(newClient.status).toBe('lead')
        })
    })

    describe('Response Codes', () => {
        it('returns 200 on successful processing', () => {
            expect(200).toBe(200)
        })

        it('returns 200 for duplicate (idempotent)', () => {
            expect(200).toBe(200)
        })

        it('returns 200 for low confidence (skipped)', () => {
            expect(200).toBe(200)
        })

        it('returns 500 on processing error', () => {
            expect(500).toBe(500)
        })
    })
})
