// Password strength validation and requirements
import { z } from 'zod'

// Password strength configuration
export const PASSWORD_CONFIG = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: true,
  MIN_STRENGTH_SCORE: 3, // 1-5 scale
  COMMON_PASSWORDS_CHECK: true,
  SEQUENTIAL_CHARS_LIMIT: 3,
  REPEATED_CHARS_LIMIT: 3,
}

// Password strength levels
export enum PasswordStrength {
  VERY_WEAK = 1,
  WEAK = 2,
  FAIR = 3,
  GOOD = 4,
  STRONG = 5
}

export interface PasswordValidationResult {
  isValid: boolean
  strength: PasswordStrength
  score: number
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

// Common weak passwords (subset - in production use a comprehensive list)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
  'qwerty123', 'admin123', 'root', 'user', 'guest', 'test', 'demo',
  'login', 'passw0rd', 'p@ssword', '12345678', '87654321', 'abcdefgh',
])

// Special characters for validation
const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

// Comprehensive password validation
export function validatePassword(password: string, userInfo?: {
  email?: string
  name?: string
  username?: string
}): PasswordValidationResult {
  const result: PasswordValidationResult = {
    isValid: false,
    strength: PasswordStrength.VERY_WEAK,
    score: 0,
    errors: [],
    warnings: [],
    suggestions: []
  }

  if (!password) {
    result.errors.push('Password is required')
    return result
  }

  // Length validation
  if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
    result.errors.push(`Password must be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters long`)
  }

  if (password.length > PASSWORD_CONFIG.MAX_LENGTH) {
    result.errors.push(`Password must be no more than ${PASSWORD_CONFIG.MAX_LENGTH} characters long`)
  }

  // Character type requirements
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChars = new RegExp(`[${SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)

  if (PASSWORD_CONFIG.REQUIRE_UPPERCASE && !hasUppercase) {
    result.errors.push('Password must contain at least one uppercase letter')
  }

  if (PASSWORD_CONFIG.REQUIRE_LOWERCASE && !hasLowercase) {
    result.errors.push('Password must contain at least one lowercase letter')
  }

  if (PASSWORD_CONFIG.REQUIRE_NUMBERS && !hasNumbers) {
    result.errors.push('Password must contain at least one number')
  }

  if (PASSWORD_CONFIG.REQUIRE_SPECIAL_CHARS && !hasSpecialChars) {
    result.errors.push(`Password must contain at least one special character (${SPECIAL_CHARS})`)
  }

  // Common password check
  if (PASSWORD_CONFIG.COMMON_PASSWORDS_CHECK && COMMON_PASSWORDS.has(password.toLowerCase())) {
    result.errors.push('Password is too common and easily guessable')
  }

  // Sequential characters check (e.g., 123, abc)
  if (hasSequentialChars(password, PASSWORD_CONFIG.SEQUENTIAL_CHARS_LIMIT)) {
    result.warnings.push('Password contains sequential characters which reduce security')
  }

  // Repeated characters check (e.g., aaa, 111)
  if (hasRepeatedChars(password, PASSWORD_CONFIG.REPEATED_CHARS_LIMIT)) {
    result.warnings.push('Password contains repeated characters which reduce security')
  }

  // Personal information check
  if (userInfo) {
    if (userInfo.email && password.toLowerCase().includes(userInfo.email.split('@')[0].toLowerCase())) {
      result.errors.push('Password should not contain your email address')
    }
    
    if (userInfo.name && password.toLowerCase().includes(userInfo.name.toLowerCase())) {
      result.errors.push('Password should not contain your name')
    }
    
    if (userInfo.username && password.toLowerCase().includes(userInfo.username.toLowerCase())) {
      result.errors.push('Password should not contain your username')
    }
  }

  // Calculate strength score
  result.score = calculatePasswordScore(password)
  result.strength = getPasswordStrength(result.score)

  // Check minimum strength requirement
  if (result.strength < PASSWORD_CONFIG.MIN_STRENGTH_SCORE) {
    result.errors.push(`Password strength is too weak (${result.strength}/5). Minimum required: ${PASSWORD_CONFIG.MIN_STRENGTH_SCORE}/5`)
  }

  // Generate suggestions
  result.suggestions = generateSuggestions(password, result)

  // Final validation
  result.isValid = result.errors.length === 0 && result.strength >= PASSWORD_CONFIG.MIN_STRENGTH_SCORE

  return result
}

// Calculate password strength score (1-5)
function calculatePasswordScore(password: string): number {
  let score = 0

  // Length scoring
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1

  // Character variety scoring
  const charTypes = [
    /[a-z]/.test(password), // lowercase
    /[A-Z]/.test(password), // uppercase
    /\d/.test(password),    // numbers
    new RegExp(`[${SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password) // special
  ].filter(Boolean).length

  score += Math.min(charTypes - 1, 2) // 0-2 points for variety

  // Complexity scoring
  const entropy = calculateEntropy(password)
  if (entropy > 30) score += 1
  if (entropy > 50) score += 1

  // Deduct for common patterns
  if (hasCommonPatterns(password)) score -= 1
  if (COMMON_PASSWORDS.has(password.toLowerCase())) score -= 2

  return Math.max(1, Math.min(5, score))
}

// Calculate password entropy
function calculateEntropy(password: string): number {
  let charsetSize = 0
  
  if (/[a-z]/.test(password)) charsetSize += 26
  if (/[A-Z]/.test(password)) charsetSize += 26
  if (/\d/.test(password)) charsetSize += 10
  if (new RegExp(`[${SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) charsetSize += SPECIAL_CHARS.length

  return password.length * Math.log2(charsetSize)
}

// Check for common patterns
function hasCommonPatterns(password: string): boolean {
  const patterns = [
    /123/,           // sequential numbers
    /abc/i,          // sequential letters
    /qwe/i,          // keyboard patterns
    /(.)\1\1/,       // repeated characters (3+)
    /password/i,     // contains "password"
    /admin/i,        // contains "admin"
  ]

  return patterns.some(pattern => pattern.test(password))
}

// Check for sequential characters
function hasSequentialChars(password: string, limit: number): boolean {
  for (let i = 0; i <= password.length - limit; i++) {
    const substr = password.slice(i, i + limit)
    
    // Check for sequential numbers
    if (/^\d+$/.test(substr)) {
      let isSequential = true
      for (let j = 1; j < substr.length; j++) {
        if (parseInt(substr[j]) !== parseInt(substr[j-1]) + 1) {
          isSequential = false
          break
        }
      }
      if (isSequential) return true
    }
    
    // Check for sequential letters
    if (/^[a-zA-Z]+$/.test(substr)) {
      let isSequential = true
      const lower = substr.toLowerCase()
      for (let j = 1; j < lower.length; j++) {
        if (lower.charCodeAt(j) !== lower.charCodeAt(j-1) + 1) {
          isSequential = false
          break
        }
      }
      if (isSequential) return true
    }
  }
  
  return false
}

// Check for repeated characters
function hasRepeatedChars(password: string, limit: number): boolean {
  for (let i = 0; i <= password.length - limit; i++) {
    const substr = password.slice(i, i + limit)
    if (new Set(substr).size === 1) return true
  }
  return false
}

// Get password strength enum from score
function getPasswordStrength(score: number): PasswordStrength {
  if (score <= 1) return PasswordStrength.VERY_WEAK
  if (score <= 2) return PasswordStrength.WEAK
  if (score <= 3) return PasswordStrength.FAIR
  if (score <= 4) return PasswordStrength.GOOD
  return PasswordStrength.STRONG
}

// Generate improvement suggestions
function generateSuggestions(password: string, result: PasswordValidationResult): string[] {
  const suggestions: string[] = []

  if (password.length < 12) {
    suggestions.push('Consider using a longer password (12+ characters)')
  }

  if (!/[A-Z]/.test(password)) {
    suggestions.push('Add uppercase letters')
  }

  if (!/[a-z]/.test(password)) {
    suggestions.push('Add lowercase letters')
  }

  if (!/\d/.test(password)) {
    suggestions.push('Add numbers')
  }

  if (!new RegExp(`[${SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) {
    suggestions.push('Add special characters (!@#$%^&*)')
  }

  if (result.strength < PasswordStrength.GOOD) {
    suggestions.push('Use a passphrase with multiple unrelated words')
    suggestions.push('Avoid common words and patterns')
    suggestions.push('Consider using a password manager')
  }

  return suggestions
}

// Zod schema for password validation
export const passwordSchema = z
  .string()
  .min(PASSWORD_CONFIG.MIN_LENGTH, `Password must be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters`)
  .max(PASSWORD_CONFIG.MAX_LENGTH, `Password must be no more than ${PASSWORD_CONFIG.MAX_LENGTH} characters`)
  .refine((password) => {
    const result = validatePassword(password)
    return result.isValid
  }, {
    message: 'Password does not meet security requirements'
  })

// Password confirmation schema
export const passwordConfirmationSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// Export types for components
export type PasswordValidationConfig = typeof PASSWORD_CONFIG