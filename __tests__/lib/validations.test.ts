import { 
  createClientSchema, 
  updateClientSchema,
  createDealSchema,
  updateDealSchema,
  createTaskSchema,
  createNoteSchema,
  commissionSettingsSchema,
  clientQuerySchema,
  dealQuerySchema,
  taskQuerySchema
} from '@/lib/validations/schemas'

describe('Validation Schemas', () => {
  describe('Client Schema', () => {
    describe('createClientSchema', () => {
      it('should validate valid client data', () => {
        const validData = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          address: '123 Main St',
          company: 'Acme Corp',
          status: 'Buyer' as const
        }

        const result = createClientSchema.safeParse(validData)
        expect(result.success).toBe(true)
      })

      it('should require name field', () => {
        const invalidData = {
          email: 'john@example.com',
          status: 'Buyer' as const
        }

        const result = createClientSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('name')
          expect(result.error.issues[0].message).toContain('required')
        }
      })

      it('should validate email format', () => {
        const invalidData = {
          name: 'John Doe',
          email: 'invalid-email',
          status: 'Buyer' as const
        }

        const result = createClientSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues.some(issue => 
            issue.path.includes('email') && issue.message.includes('Invalid email format')
          )).toBe(true)
        }
      })

      it('should validate phone format', () => {
        const invalidData = {
          name: 'John Doe',
          phone: 'invalid-phone-format',
          status: 'Buyer' as const
        }

        const result = createClientSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues.some(issue => 
            issue.path.includes('phone') && issue.message.includes('Invalid phone format')
          )).toBe(true)
        }
      })

      it('should accept valid phone formats', () => {
        const validPhones = [
          '+1234567890',
          '123-456-7890',
          '(123) 456-7890',
          '123.456.7890',
          '123 456 7890',
          ''  // Empty should be valid
        ]

        validPhones.forEach(phone => {
          const data = {
            name: 'John Doe',
            phone,
            status: 'Buyer' as const
          }

          const result = createClientSchema.safeParse(data)
          expect(result.success).toBe(true)
        })
      })

      it('should validate status enum', () => {
        const invalidData = {
          name: 'John Doe',
          status: 'InvalidStatus' as any
        }

        const result = createClientSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
      })

      it('should validate string lengths', () => {
        const invalidData = {
          name: 'a'.repeat(101), // Too long
          address: 'b'.repeat(501), // Too long
          company: 'c'.repeat(101), // Too long
          status: 'Buyer' as const
        }

        const result = createClientSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues.some(issue => issue.message.includes('too long'))).toBe(true)
        }
      })

      it('should allow optional fields to be empty', () => {
        const minimalData = {
          name: 'John Doe',
          status: 'Buyer' as const
        }

        const result = createClientSchema.safeParse(minimalData)
        expect(result.success).toBe(true)
      })
    })

    describe('updateClientSchema', () => {
      it('should allow partial updates', () => {
        const partialData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Jane Doe'
        }

        const result = updateClientSchema.safeParse(partialData)
        expect(result.success).toBe(true)
      })

      it('should require valid UUID for id', () => {
        const invalidData = {
          id: 'invalid-uuid',
          name: 'Jane Doe'
        }

        const result = updateClientSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
      })
    })

    describe('clientQuerySchema', () => {
      it('should validate query parameters', () => {
        const validQuery = {
          page: 1,
          limit: 10,
          search: 'john',
          status: 'Buyer' as const
        }

        const result = clientQuerySchema.safeParse(validQuery)
        expect(result.success).toBe(true)
      })

      it('should coerce string numbers', () => {
        const queryWithStrings = {
          page: '2',
          limit: '20'
        }

        const result = clientQuerySchema.safeParse(queryWithStrings)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.page).toBe(2)
          expect(result.data.limit).toBe(20)
        }
      })

      it('should enforce pagination limits', () => {
        const invalidQuery = {
          page: 0, // Too low
          limit: 101 // Too high
        }

        const result = clientQuerySchema.safeParse(invalidQuery)
        expect(result.success).toBe(false)
      })

      it('should limit search string length', () => {
        const invalidQuery = {
          search: 'a'.repeat(101) // Too long
        }

        const result = clientQuerySchema.safeParse(invalidQuery)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Deal Schema', () => {
    describe('createDealSchema', () => {
      it('should validate valid deal data', () => {
        const validData = {
          client_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Downtown Condo Sale',
          value: 500000,
          status: 'Lead' as const,
          probability: 75,
          expected_close_date: '2024-12-31T00:00:00Z',
          commission: 15000,
          property_address: '123 Main St, Downtown',
          property_type: 'Condo',
          property_bedrooms: 2,
          property_bathrooms: 1.5,
          property_sqft: 1200
        }

        const result = createDealSchema.safeParse(validData)
        expect(result.success).toBe(true)
      })

      it('should require client_id and title', () => {
        const invalidData = {
          value: 500000
        }

        const result = createDealSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues.some(issue => issue.path.includes('client_id'))).toBe(true)
          expect(result.error.issues.some(issue => issue.path.includes('title'))).toBe(true)
        }
      })

      it('should validate UUID format for client_id', () => {
        const invalidData = {
          client_id: 'invalid-uuid',
          title: 'Test Deal'
        }

        const result = createDealSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
      })

      it('should validate numeric constraints', () => {
        const invalidData = {
          client_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Deal',
          value: -1000, // Negative value
          probability: 150, // Over 100
          property_bedrooms: -1, // Negative bedrooms
          property_sqft: -500 // Negative sqft
        }

        const result = createDealSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
      })

      it('should coerce string numbers to numbers', () => {
        const dataWithStrings = {
          client_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Deal',
          value: '500000',
          probability: '75',
          property_bedrooms: '3',
          property_bathrooms: '2.5',
          property_sqft: '2000'
        }

        const result = createDealSchema.safeParse(dataWithStrings)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(typeof result.data.value).toBe('number')
          expect(typeof result.data.probability).toBe('number')
          expect(typeof result.data.property_bedrooms).toBe('number')
        }
      })

      it('should validate status enum', () => {
        const validStatuses = ['Lead', 'In Progress', 'Under Contract', 'Closed', 'Lost']
        
        validStatuses.forEach(status => {
          const data = {
            client_id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Test Deal',
            status
          }

          const result = createDealSchema.safeParse(data)
          expect(result.success).toBe(true)
        })

        // Test invalid status
        const invalidData = {
          client_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Deal',
          status: 'InvalidStatus'
        }

        const result = createDealSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
      })

      it('should validate datetime format', () => {
        const validData = {
          client_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Deal',
          expected_close_date: '2024-12-31T10:00:00Z'
        }

        const result = createDealSchema.safeParse(validData)
        expect(result.success).toBe(true)

        // Test invalid datetime
        const invalidData = {
          client_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Deal',
          expected_close_date: 'invalid-date'
        }

        const invalidResult = createDealSchema.safeParse(invalidData)
        expect(invalidResult.success).toBe(false)
      })
    })

    describe('dealQuerySchema', () => {
      it('should validate deal query parameters', () => {
        const validQuery = {
          page: 1,
          limit: 10,
          search: 'downtown',
          status: 'Lead' as const,
          client_id: '123e4567-e89b-12d3-a456-426614174000'
        }

        const result = dealQuerySchema.safeParse(validQuery)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Task Schema', () => {
    describe('createTaskSchema', () => {
      it('should validate valid task data', () => {
        const validData = {
          title: 'Follow up call',
          description: 'Call client about property viewing',
          due_date: '2024-12-31T10:00:00Z',
          priority: 'High' as const,
          status: 'Pending' as const,
          type: 'Call' as const,
          client_id: '123e4567-e89b-12d3-a456-426614174000',
          deal_id: '123e4567-e89b-12d3-a456-426614174001'
        }

        const result = createTaskSchema.safeParse(validData)
        expect(result.success).toBe(true)
      })

      it('should require title', () => {
        const invalidData = {
          description: 'Task without title'
        }

        const result = createTaskSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues.some(issue => issue.path.includes('title'))).toBe(true)
        }
      })

      it('should validate enum fields', () => {
        const priorities = ['Low', 'Medium', 'High']
        const statuses = ['Pending', 'In Progress', 'Completed']
        const types = ['Call', 'Email', 'Meeting', 'Document', 'Follow-up', 'Other']

        priorities.forEach(priority => {
          const data = {
            title: 'Test Task',
            priority
          }
          expect(createTaskSchema.safeParse(data).success).toBe(true)
        })

        statuses.forEach(status => {
          const data = {
            title: 'Test Task',
            status
          }
          expect(createTaskSchema.safeParse(data).success).toBe(true)
        })

        types.forEach(type => {
          const data = {
            title: 'Test Task',
            type
          }
          expect(createTaskSchema.safeParse(data).success).toBe(true)
        })
      })

      it('should validate string lengths', () => {
        const invalidData = {
          title: 'a'.repeat(201), // Too long
          description: 'b'.repeat(1001), // Too long
        }

        const result = createTaskSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
      })

      it('should require valid datetime for due_date', () => {
        const validData = {
          title: 'Test Task',
          due_date: '2024-12-31T10:00:00Z'
        }

        const result = createTaskSchema.safeParse(validData)
        expect(result.success).toBe(true)

        const invalidData = {
          title: 'Test Task',
          due_date: 'invalid-date'
        }

        const invalidResult = createTaskSchema.safeParse(invalidData)
        expect(invalidResult.success).toBe(false)
      })
    })
  })

  describe('Note Schema', () => {
    describe('createNoteSchema', () => {
      it('should validate valid note data', () => {
        const validData = {
          content: 'Client expressed interest in downtown properties',
          type: 'note' as const,
          client_id: '123e4567-e89b-12d3-a456-426614174000'
        }

        const result = createNoteSchema.safeParse(validData)
        expect(result.success).toBe(true)
      })

      it('should require content', () => {
        const invalidData = {
          type: 'note' as const
        }

        const result = createNoteSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues.some(issue => issue.path.includes('content'))).toBe(true)
        }
      })

      it('should validate content length', () => {
        const invalidData = {
          content: 'a'.repeat(2001) // Too long
        }

        const result = createNoteSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
      })

      it('should validate type enum', () => {
        const types = ['note', 'call', 'meeting', 'email']

        types.forEach(type => {
          const data = {
            content: 'Test note',
            type
          }
          expect(createNoteSchema.safeParse(data).success).toBe(true)
        })

        const invalidData = {
          content: 'Test note',
          type: 'invalid-type'
        }

        const result = createNoteSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Commission Settings Schema', () => {
    describe('commissionSettingsSchema', () => {
      it('should validate valid percentage', () => {
        const validData = {
          default_percentage: 2.5
        }

        const result = commissionSettingsSchema.safeParse(validData)
        expect(result.success).toBe(true)
      })

      it('should enforce percentage range (0-100)', () => {
        const invalidLow = {
          default_percentage: -1
        }

        const invalidHigh = {
          default_percentage: 101
        }

        expect(commissionSettingsSchema.safeParse(invalidLow).success).toBe(false)
        expect(commissionSettingsSchema.safeParse(invalidHigh).success).toBe(false)
      })

      it('should accept boundary values', () => {
        const minValue = {
          default_percentage: 0
        }

        const maxValue = {
          default_percentage: 100
        }

        expect(commissionSettingsSchema.safeParse(minValue).success).toBe(true)
        expect(commissionSettingsSchema.safeParse(maxValue).success).toBe(true)
      })

      it('should coerce string numbers', () => {
        const stringData = {
          default_percentage: '2.5'
        }

        const result = commissionSettingsSchema.safeParse(stringData)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(typeof result.data.default_percentage).toBe('number')
          expect(result.data.default_percentage).toBe(2.5)
        }
      })
    })
  })

  describe('Query Schemas', () => {
    describe('taskQuerySchema', () => {
      it('should validate task query parameters', () => {
        const validQuery = {
          page: 1,
          limit: 10,
          search: 'follow up',
          status: 'Pending' as const,
          priority: 'High' as const,
          client_id: '123e4567-e89b-12d3-a456-426614174000',
          deal_id: '123e4567-e89b-12d3-a456-426614174001'
        }

        const result = taskQuerySchema.safeParse(validQuery)
        expect(result.success).toBe(true)
      })

      it('should apply default values', () => {
        const minimalQuery = {}

        const result = taskQuerySchema.safeParse(minimalQuery)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.page).toBe(1)
          expect(result.data.limit).toBe(10)
        }
      })
    })
  })
})