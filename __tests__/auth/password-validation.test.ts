import { 
  validatePassword, 
  generateSecurePassword, 
  hashPassword, 
  verifyPassword,
  checkPasswordStrength,
  getPasswordRequirements 
} from '@/lib/auth/password-validation'

describe('Password Validation', () => {
  describe('Password Requirements', () => {
    it('should return correct password requirements', () => {
      const requirements = getPasswordRequirements()
      
      expect(requirements).toEqual({
        minLength: 8,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        forbiddenPatterns: expect.any(Array),
        commonPasswords: expect.any(Array)
      })
    })
  })

  describe('Password Validation', () => {
    it('should accept strong passwords', () => {
      const strongPasswords = [
        'StrongP@ssw0rd123',
        'MyS3cur3P@ssword!',
        'C0mpl3xP@ssw0rd#2024',
        'Un1qu3&S3cur3P@ss'
      ]

      strongPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
        expect(result.strength).toBeGreaterThanOrEqual(4)
      })
    })

    it('should reject passwords that are too short', () => {
      const shortPasswords = [
        'Short1!',
        'Ab1!',
        '1234567'
      ]

      shortPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('Password must be at least 8 characters long')
      })
    })

    it('should reject passwords that are too long', () => {
      const longPassword = 'A'.repeat(129) + '1!'
      
      const result = validatePassword(longPassword)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be no more than 128 characters long')
    })

    it('should reject passwords without uppercase letters', () => {
      const noUppercasePasswords = [
        'nouppercase123!',
        'alllowercase@456',
        'test123password!'
      ]

      noUppercasePasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('Password must contain at least one uppercase letter')
      })
    })

    it('should reject passwords without lowercase letters', () => {
      const noLowercasePasswords = [
        'NOLOWERCASE123!',
        'ALLUPPERCASE@456',
        'TEST123PASSWORD!'
      ]

      noLowercasePasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('Password must contain at least one lowercase letter')
      })
    })

    it('should reject passwords without numbers', () => {
      const noNumberPasswords = [
        'NoNumbersHere!',
        'OnlyLetters@Special',
        'TestPassword!'
      ]

      noNumberPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('Password must contain at least one number')
      })
    })

    it('should reject passwords without special characters', () => {
      const noSpecialCharPasswords = [
        'NoSpecialChars123',
        'OnlyLettersAndNumbers456',
        'TestPassword789'
      ]

      noSpecialCharPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('Password must contain at least one special character')
      })
    })

    it('should reject common passwords', () => {
      const commonPasswords = [
        'Password123!',
        'Qwerty123!',
        'Admin123!',
        '12345678!A',
        'Welcome123!'
      ]

      commonPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('Password is too common and easily guessable')
      })
    })

    it('should reject passwords with forbidden patterns', () => {
      const forbiddenPatternPasswords = [
        'Abcdef123!', // Sequential letters
        'Password1234!', // Sequential numbers
        'Qwerty123!', // Keyboard pattern
        'Test111111!', // Repeated characters
        'Aa1!Aa1!Aa1!' // Repeated pattern
      ]

      forbiddenPatternPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(error => 
          error.includes('contains forbidden pattern')
        )).toBe(true)
      })
    })

    it('should provide multiple error messages for multiple issues', () => {
      const weakPassword = 'weak'
      
      const result = validatePassword(weakPassword)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
      expect(result.errors).toContain('Password must be at least 8 characters long')
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
      expect(result.errors).toContain('Password must contain at least one number')
      expect(result.errors).toContain('Password must contain at least one special character')
    })
  })

  describe('Password Strength Scoring', () => {
    it('should score password strength correctly', () => {
      const testCases = [
        { password: 'weak', expectedStrength: 1 },
        { password: 'Weak123', expectedStrength: 2 },
        { password: 'Weak123!', expectedStrength: 3 },
        { password: 'StrongP@ssw0rd123', expectedStrength: 5 },
        { password: 'VeryS3cur3&C0mpl3xP@ssw0rd!2024', expectedStrength: 5 }
      ]

      testCases.forEach(({ password, expectedStrength }) => {
        const strength = checkPasswordStrength(password)
        expect(strength).toBe(expectedStrength)
      })
    })

    it('should consider length in strength scoring', () => {
      const passwords = [
        'Test123!',      // 8 chars
        'Test1234!',     // 9 chars
        'TestPassword123!', // 16 chars
        'VeryLongTestPasswordWith123AndSpecial!' // 38 chars
      ]

      const strengths = passwords.map(checkPasswordStrength)
      
      // Longer passwords should generally be stronger
      expect(strengths[3]).toBeGreaterThan(strengths[0])
    })

    it('should consider character diversity in strength scoring', () => {
      const basicPassword = 'Test123!'
      const diversePassword = 'T3st!@#$%^&*()P@ssw0rd'
      
      const basicStrength = checkPasswordStrength(basicPassword)
      const diverseStrength = checkPasswordStrength(diversePassword)
      
      expect(diverseStrength).toBeGreaterThan(basicStrength)
    })
  })

  describe('Secure Password Generation', () => {
    it('should generate passwords that meet all requirements', () => {
      const passwords = Array.from({ length: 10 }, () => generateSecurePassword())
      
      passwords.forEach(password => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(true)
        expect(result.strength).toBeGreaterThanOrEqual(4)
      })
    })

    it('should generate passwords of specified length', () => {
      const lengths = [12, 16, 20, 24]
      
      lengths.forEach(length => {
        const password = generateSecurePassword(length)
        expect(password.length).toBe(length)
      })
    })

    it('should generate unique passwords', () => {
      const passwords = Array.from({ length: 100 }, () => generateSecurePassword())
      const uniquePasswords = new Set(passwords)
      
      // All passwords should be unique
      expect(uniquePasswords.size).toBe(passwords.length)
    })

    it('should include all required character types', () => {
      const password = generateSecurePassword(16)
      
      expect(password).toMatch(/[a-z]/) // Lowercase
      expect(password).toMatch(/[A-Z]/) // Uppercase
      expect(password).toMatch(/[0-9]/) // Numbers
      expect(password).toMatch(/[!@#$%^&*(),.?":{}|<>]/) // Special chars
    })

    it('should handle custom character sets', () => {
      const customOptions = {
        length: 12,
        includeUppercase: false,
        includeSpecialChars: false,
        customChars: 'xyz123'
      }
      
      const password = generateSecurePassword(customOptions.length, customOptions)
      
      expect(password).not.toMatch(/[A-Z]/)
      expect(password).not.toMatch(/[!@#$%^&*()]/)
      
      // Should only contain allowed characters
      const allowedChars = 'abcdefghijklmnopqrstuvwxyz0123456789xyz123'
      const passwordChars = password.split('')
      passwordChars.forEach(char => {
        expect(allowedChars.includes(char)).toBe(true)
      })
    })
  })

  describe('Password Hashing and Verification', () => {
    it('should hash passwords securely', async () => {
      const password = 'TestPassword123!'
      const hash = await hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50) // Bcrypt hashes are typically 60 chars
      expect(hash.startsWith('$2b$')).toBe(true) // Bcrypt format
    })

    it('should verify passwords correctly', async () => {
      const password = 'TestPassword123!'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
      
      const isInvalid = await verifyPassword('WrongPassword123!', hash)
      expect(isInvalid).toBe(false)
    })

    it('should handle different hashing rounds', async () => {
      const password = 'TestPassword123!'
      
      const hash10 = await hashPassword(password, 10)
      const hash12 = await hashPassword(password, 12)
      
      expect(await verifyPassword(password, hash10)).toBe(true)
      expect(await verifyPassword(password, hash12)).toBe(true)
      
      // Different rounds should produce different hashes
      expect(hash10).not.toBe(hash12)
    })

    it('should be resistant to timing attacks', async () => {
      const password = 'TestPassword123!'
      const hash = await hashPassword(password)
      
      const startTime = performance.now()
      await verifyPassword(password, hash)
      const correctTime = performance.now() - startTime
      
      const startTime2 = performance.now()
      await verifyPassword('WrongPassword123!', hash)
      const incorrectTime = performance.now() - startTime2
      
      // Times should be similar (bcrypt is naturally resistant to timing attacks)
      const timeDifference = Math.abs(correctTime - incorrectTime)
      expect(timeDifference).toBeLessThan(50) // Allow 50ms difference
    })

    it('should handle invalid hash formats', async () => {
      const password = 'TestPassword123!'
      const invalidHashes = [
        'invalid-hash',
        '$2a$10$invalid',
        '',
        null,
        undefined
      ]
      
      for (const invalidHash of invalidHashes) {
        await expect(verifyPassword(password, invalidHash as string)).rejects.toThrow()
      }
    })

    it('should handle edge cases in password comparison', async () => {
      const hash = await hashPassword('TestPassword123!')
      
      // Empty password
      expect(await verifyPassword('', hash)).toBe(false)
      
      // Very long password
      const longPassword = 'A'.repeat(1000) + '123!'
      expect(await verifyPassword(longPassword, hash)).toBe(false)
      
      // Password with null bytes
      const nullBytePassword = 'Test\x00Password123!'
      expect(await verifyPassword(nullBytePassword, hash)).toBe(false)
    })
  })

  describe('Security and Performance', () => {
    it('should handle concurrent password operations', async () => {
      const password = 'TestPassword123!'
      
      // Multiple concurrent hash operations
      const hashPromises = Array.from({ length: 10 }, () => hashPassword(password))
      const hashes = await Promise.all(hashPromises)
      
      // All hashes should be different but verify correctly
      const uniqueHashes = new Set(hashes)
      expect(uniqueHashes.size).toBe(hashes.length)
      
      // All should verify correctly
      const verifyPromises = hashes.map(hash => verifyPassword(password, hash))
      const results = await Promise.all(verifyPromises)
      
      results.forEach(result => expect(result).toBe(true))
    })

    it('should have reasonable performance for password operations', async () => {
      const password = 'TestPassword123!'
      
      // Hash operation should complete within reasonable time
      const hashStart = performance.now()
      const hash = await hashPassword(password)
      const hashTime = performance.now() - hashStart
      
      expect(hashTime).toBeLessThan(1000) // Should complete within 1 second
      
      // Verify operation should complete within reasonable time
      const verifyStart = performance.now()
      await verifyPassword(password, hash)
      const verifyTime = performance.now() - verifyStart
      
      expect(verifyTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle memory efficiently with large passwords', async () => {
      const largePassword = 'A'.repeat(100) + '123!'
      
      const hash = await hashPassword(largePassword)
      expect(hash).toBeDefined()
      
      const isValid = await verifyPassword(largePassword, hash)
      expect(isValid).toBe(true)
    })

    it('should prevent password enumeration through error messages', () => {
      const testPasswords = [
        '',
        'a',
        'password',
        'PASSWORD',
        '12345678',
        'Password',
        'Password1',
        'Password123'
      ]
      
      testPasswords.forEach(password => {
        const result = validatePassword(password)
        if (!result.isValid) {
          // Error messages should not reveal the exact password being tested
          result.errors.forEach(error => {
            expect(error).not.toContain(password)
          })
        }
      })
    })

    it('should sanitize passwords in error logs', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      try {
        // Trigger an error condition that might log password info
        validatePassword(null as any)
      } catch (error) {
        // Any logged errors should not contain sensitive info
        const loggedCalls = consoleSpy.mock.calls
        loggedCalls.forEach(call => {
          const logMessage = call.join(' ')
          expect(logMessage).not.toContain('password')
          expect(logMessage).not.toContain('Password')
        })
      }
      
      consoleSpy.mockRestore()
    })
  })

  describe('Password Policy Enforcement', () => {
    it('should enforce password history restrictions', () => {
      const currentPassword = 'CurrentP@ssw0rd123'
      const previousPasswords = [
        'PreviousP@ssw0rd123',
        'OldP@ssw0rd456',
        'AncientP@ssw0rd789'
      ]
      
      const result = validatePassword(currentPassword, { previousPasswords })
      expect(result.isValid).toBe(true)
      
      // Should reject if trying to reuse a previous password
      const reuseResult = validatePassword(previousPasswords[0], { previousPasswords })
      expect(reuseResult.isValid).toBe(false)
      expect(reuseResult.errors).toContain('Password has been used recently')
    })

    it('should validate against custom password policies', () => {
      const customPolicy = {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxRepeatingChars: 2,
        forbidUserInfo: ['john.doe', 'johndoe', 'company']
      }
      
      // Should pass custom policy
      const goodPassword = 'CustomP@ssw0rd123'
      const result = validatePassword(goodPassword, customPolicy)
      expect(result.isValid).toBe(true)
      
      // Should fail with user info
      const userInfoPassword = 'johndoeP@ssw0rd123'
      const userInfoResult = validatePassword(userInfoPassword, customPolicy)
      expect(userInfoResult.isValid).toBe(false)
      expect(userInfoResult.errors).toContain('Password contains personal information')
    })
  })
})