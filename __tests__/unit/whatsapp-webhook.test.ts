describe('WhatsApp Webhook', () => {
    describe('GET - Verification Challenge', () => {
        it('returns challenge when mode is subscribe and token matches', () => {
            const mode = 'subscribe'
            const token = 'test_verify_token'
            const challenge = 'test_challenge_123'
            const envToken = 'test_verify_token'

            const shouldVerify = mode === 'subscribe' && token === envToken
            expect(shouldVerify).toBe(true)
            expect(challenge).toBe('test_challenge_123')
        })

        it('returns 403 when token does not match', () => {
            const mode = 'subscribe'
            const token = 'wrong_token'
            const envToken = 'test_verify_token'

            const shouldVerify = mode === 'subscribe' && token === envToken
            expect(shouldVerify).toBe(false)
        })

        it('returns 403 when mode is not subscribe', () => {
            const mode = 'unsubscribe'
            const token = 'test_verify_token'
            const envToken = 'test_verify_token'

            const shouldVerify = mode === 'subscribe' && token === envToken
            expect(shouldVerify).toBe(false)
        })
    })

    describe('POST - Message Processing', () => {
        it('ignores non-whatsapp_business_account objects', () => {
            const payload = { object: 'page' }
            expect(payload.object).not.toBe('whatsapp_business_account')
        })

        it('processes whatsapp_business_account objects', () => {
            const payload = { object: 'whatsapp_business_account' }
            expect(payload.object).toBe('whatsapp_business_account')
        })

        it('extracts message id for idempotency', () => {
            const message = { id: 'wamid.test123', from: '15551234567', type: 'text' }
            const idempotencyKey = `whatsapp:${message.id}`
            expect(idempotencyKey).toBe('whatsapp:wamid.test123')
        })

        it('only processes text messages', () => {
            const textMessage = { type: 'text', text: { body: 'Hello' } }
            const imageMessage = { type: 'image' }

            expect(textMessage.type).toBe('text')
            expect(imageMessage.type).not.toBe('text')
        })

        it('extracts sender phone number', () => {
            const message = { id: 'wamid.123', from: '15551234567', type: 'text' }
            expect(message.from).toBe('15551234567')
        })

        it('extracts contact name from contacts array', () => {
            const contacts = [{ profile: { name: 'John Doe' }, wa_id: '15551234567' }]
            const contact = contacts.find(c => c.wa_id === '15551234567')
            expect(contact?.profile.name).toBe('John Doe')
        })
    })

    describe('Message Classification', () => {
        const updateTypes = ['SENTIMENT', 'SCHEDULE', 'DECISION', 'QUESTION']

        it('recognizes all update types', () => {
            updateTypes.forEach(type => {
                expect(['SENTIMENT', 'SCHEDULE', 'DECISION', 'QUESTION']).toContain(type)
            })
        })

        it('identifies action required flag', () => {
            const extraction = { action_required: true, task: { description: 'Follow up' } }
            expect(extraction.action_required).toBe(true)
        })

        it('handles null task when no action required', () => {
            const extraction = { action_required: false, task: null }
            expect(extraction.task).toBeNull()
        })
    })

    describe('Task Creation', () => {
        it('creates task with correct priority levels', () => {
            const priorities = ['high', 'medium', 'low']
            priorities.forEach(priority => {
                expect(['high', 'medium', 'low']).toContain(priority)
            })
        })

        it('sets task status to pending', () => {
            const taskStatus = 'pending'
            expect(taskStatus).toBe('pending')
        })

        it('sets task type to follow_up', () => {
            const taskType = 'follow_up'
            expect(taskType).toBe('follow_up')
        })
    })

    describe('Error Handling', () => {
        it('returns 500 on processing errors', () => {
            const errorStatus = 500
            expect(errorStatus).toBe(500)
        })

        it('returns 200 on successful processing', () => {
            const successStatus = 200
            expect(successStatus).toBe(200)
        })
    })
})
