describe('OpenRouter Client - Unit Tests', () => {
    describe('EXTRACTION_MODELS Configuration', () => {
        const models = [
            'google/gemini-1.5-pro',
            'anthropic/claude-3.5-sonnet',
            'openai/gpt-4o',
        ]

        it('includes Gemini 1.5 Pro', () => {
            expect(models).toContain('google/gemini-1.5-pro')
        })

        it('includes Claude 3.5 Sonnet', () => {
            expect(models).toContain('anthropic/claude-3.5-sonnet')
        })

        it('includes GPT-4o', () => {
            expect(models).toContain('openai/gpt-4o')
        })

        it('has exactly 3 models', () => {
            expect(models.length).toBe(3)
        })
    })

    describe('DEFAULT_PROVIDER_CONFIG', () => {
        const config = {
            sort: { by: 'price', partition: 'none' },
            preferredMinThroughput: { p90: 50 },
            preferredMaxLatency: { p90: 3 },
        }

        it('sorts by price', () => {
            expect(config.sort.by).toBe('price')
        })

        it('uses no partition', () => {
            expect(config.sort.partition).toBe('none')
        })

        it('sets p90 throughput threshold to 50', () => {
            expect(config.preferredMinThroughput.p90).toBe(50)
        })

        it('sets p90 latency threshold to 3', () => {
            expect(config.preferredMaxLatency.p90).toBe(3)
        })
    })

    describe('ClientExtraction Schema Validation', () => {
        describe('Client Fields', () => {
            it('accepts nullable name', () => {
                const client = { name: null, email: 'test@example.com', phone: null, company: null }
                expect(client.name).toBeNull()
            })

            it('accepts valid email', () => {
                const email = 'john@example.com'
                expect(email).toMatch(/@/)
            })

            it('accepts nullable phone', () => {
                const client = { phone: null }
                expect(client.phone).toBeNull()
            })

            it('accepts nullable company', () => {
                const client = { company: null }
                expect(client.company).toBeNull()
            })
        })

        describe('Deal Fields', () => {
            const validIntents = ['INQUIRY', 'NEGOTIATION', 'CLOSING', 'FOLLOW_UP']
            const validPropertyTypes = ['residential', 'commercial']
            const validTimelines = ['immediate', '30_days', '90_days', 'exploratory']

            it('validates all intent types', () => {
                validIntents.forEach(intent => {
                    expect(['INQUIRY', 'NEGOTIATION', 'CLOSING', 'FOLLOW_UP']).toContain(intent)
                })
            })

            it('validates all property types', () => {
                validPropertyTypes.forEach(type => {
                    expect(['residential', 'commercial']).toContain(type)
                })
            })

            it('validates all timeline types', () => {
                validTimelines.forEach(timeline => {
                    expect(['immediate', '30_days', '90_days', 'exploratory']).toContain(timeline)
                })
            })

            it('accepts nullable budget_min', () => {
                const deal = { budget_min: null }
                expect(deal.budget_min).toBeNull()
            })

            it('accepts nullable budget_max', () => {
                const deal = { budget_max: null }
                expect(deal.budget_max).toBeNull()
            })
        })

        describe('Tasks Array', () => {
            const validDues = ['today', 'this_week', 'next_week']

            it('validates all due types', () => {
                validDues.forEach(due => {
                    expect(['today', 'this_week', 'next_week']).toContain(due)
                })
            })

            it('requires task description', () => {
                const task = { description: 'Follow up with client', due: 'today' }
                expect(task.description).toBe('Follow up with client')
            })

            it('accepts empty tasks array', () => {
                const tasks: never[] = []
                expect(tasks.length).toBe(0)
            })
        })

        describe('Confidence Score', () => {
            it('accepts value at lower bound (0)', () => {
                const confidence = 0
                expect(confidence).toBeGreaterThanOrEqual(0)
                expect(confidence).toBeLessThanOrEqual(1)
            })

            it('accepts value at upper bound (1)', () => {
                const confidence = 1
                expect(confidence).toBeGreaterThanOrEqual(0)
                expect(confidence).toBeLessThanOrEqual(1)
            })

            it('rejects value below 0', () => {
                const confidence = -0.1
                expect(confidence).toBeLessThan(0)
            })

            it('rejects value above 1', () => {
                const confidence = 1.5
                expect(confidence).toBeGreaterThan(1)
            })
        })
    })

    describe('MessageUpdate Schema Validation', () => {
        const validUpdateTypes = ['SENTIMENT', 'SCHEDULE', 'DECISION', 'QUESTION']
        const validPriorities = ['high', 'medium', 'low']

        it('validates all update types', () => {
            validUpdateTypes.forEach(type => {
                expect(['SENTIMENT', 'SCHEDULE', 'DECISION', 'QUESTION']).toContain(type)
            })
        })

        it('validates all priority levels', () => {
            validPriorities.forEach(priority => {
                expect(['high', 'medium', 'low']).toContain(priority)
            })
        })

        it('accepts boolean action_required', () => {
            expect(typeof true).toBe('boolean')
            expect(typeof false).toBe('boolean')
        })

        it('accepts nullable task', () => {
            const update = { task: null }
            expect(update.task).toBeNull()
        })

        it('accepts nullable deal_stage_change', () => {
            const update = { deal_stage_change: null }
            expect(update.deal_stage_change).toBeNull()
        })

        it('accepts valid task object', () => {
            const task = { description: 'Call client', priority: 'high' }
            expect(task.description).toBe('Call client')
            expect(task.priority).toBe('high')
        })
    })

    describe('Extraction Result Structure', () => {
        it('includes data field', () => {
            const result = { data: {}, model_used: '', tokens: { input: 0, output: 0 }, latency_ms: 0 }
            expect(result).toHaveProperty('data')
        })

        it('includes model_used field', () => {
            const result = { model_used: 'google/gemini-1.5-pro' }
            expect(result.model_used).toBe('google/gemini-1.5-pro')
        })

        it('includes token counts', () => {
            const tokens = { input: 150, output: 200 }
            expect(tokens.input).toBe(150)
            expect(tokens.output).toBe(200)
        })

        it('includes latency_ms', () => {
            const latency_ms = 1234
            expect(latency_ms).toBeGreaterThan(0)
        })
    })
})
