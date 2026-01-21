import { BusinessCardData, BusinessCardScanResult } from '@/lib/smart-import/types'

/**
 * Business Card Scanner Service
 * Handles OCR and data extraction from business card images
 */
export class BusinessCardScanner {
  private static readonly EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  private static readonly PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g
  private static readonly URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g

  /**
   * Extract structured data from OCR text using pattern matching and heuristics
   */
  static extractContactInfo(ocrText: string): BusinessCardData {
    const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    const result: BusinessCardData = {}

    // Extract email addresses
    const emails = ocrText.match(this.EMAIL_REGEX)
    if (emails && emails.length > 0) {
      result.email = emails[0].toLowerCase()
    }

    // Extract phone numbers
    const phones = ocrText.match(this.PHONE_REGEX)
    if (phones && phones.length > 0) {
      result.phone = this.formatPhoneNumber(phones[0])
    }

    // Extract URLs/websites
    const urls = ocrText.match(this.URL_REGEX)
    if (urls && urls.length > 0) {
      result.website = urls[0].toLowerCase()
    }

    // Extract name (usually first line or line before title)
    result.name = this.extractName(lines)

    // Extract title and company
    const titleCompany = this.extractTitleAndCompany(lines, result.name)
    result.title = titleCompany.title
    result.company = titleCompany.company

    // Extract address
    result.address = this.extractAddress(lines)

    // Extract LinkedIn if present
    const linkedinMatch = ocrText.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/i)
    if (linkedinMatch) {
      result.linkedin = 'https://' + linkedinMatch[0]
    }

    return result
  }

  /**
   * Enhanced OCR processing with preprocessing
   */
  static async performOCR(imageData: string, format: string): Promise<string> {
    try {
      // In a real implementation, this would call a proper OCR service
      // For now, we'll simulate OCR processing
      
      // Convert base64 to blob for processing
      const response = await fetch(`data:image/${format};base64,${imageData}`)
      const blob = await response.blob()

      // Simulate OCR processing delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // In production, integrate with:
      // - Google Cloud Vision API
      // - Azure Cognitive Services
      // - AWS Textract
      // - Tesseract.js for client-side processing

      return this.simulateOCR(blob)
    } catch (error) {
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Simulate OCR processing (replace with actual OCR service)
   */
  private static async simulateOCR(blob: Blob): Promise<string> {
    // This is a mock implementation
    // In production, replace with actual OCR service call
    return `John Smith
Real Estate Agent
ABC Realty Group
john.smith@abcrealty.com
(555) 123-4567
123 Main Street
Anytown, ST 12345
www.abcrealty.com
LinkedIn: linkedin.com/in/johnsmith`
  }

  /**
   * Extract person's name from OCR lines
   */
  private static extractName(lines: string[]): string | undefined {
    if (lines.length === 0) return undefined

    // Common title/role keywords that indicate this line is NOT a name
    const roleKeywords = [
      'agent', 'broker', 'realtor', 'associate', 'manager', 'director',
      'advisor', 'consultant', 'specialist', 'representative', 'sales',
      'president', 'vice', 'ceo', 'cfo', 'owner', 'partner'
    ]

    // Look for a line that looks like a name (2-3 words, no numbers, not a role)
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      const line = lines[i]
      
      // Skip if contains email, phone, or website patterns
      if (this.EMAIL_REGEX.test(line) || this.PHONE_REGEX.test(line) || this.URL_REGEX.test(line)) {
        continue
      }

      // Skip if contains numbers (likely not a name)
      if (/\d/.test(line)) {
        continue
      }

      // Skip if contains common role keywords
      if (roleKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        continue
      }

      // Check if it looks like a name (2-4 words, proper capitalization)
      const words = line.split(' ').filter(word => word.length > 0)
      if (words.length >= 2 && words.length <= 4) {
        // Check if first letter of each word is capitalized
        const isProperCase = words.every(word => /^[A-Z]/.test(word))
        if (isProperCase) {
          return line
        }
      }
    }

    // Fallback: return first line if no better candidate found
    return lines[0]
  }

  /**
   * Extract title and company information
   */
  private static extractTitleAndCompany(lines: string[], name?: string): { title?: string, company?: string } {
    const result: { title?: string, company?: string } = {}
    
    const titleKeywords = [
      'agent', 'broker', 'realtor', 'associate', 'manager', 'director',
      'advisor', 'consultant', 'specialist', 'representative', 'sales'
    ]

    const companyKeywords = [
      'realty', 'real estate', 'properties', 'group', 'company', 'inc',
      'llc', 'corp', 'corporation', 'team', 'partners', 'associates'
    ]

    for (const line of lines) {
      // Skip name line and contact info
      if (line === name || this.EMAIL_REGEX.test(line) || this.PHONE_REGEX.test(line)) {
        continue
      }

      const lowerLine = line.toLowerCase()

      // Check if this line contains title keywords
      if (titleKeywords.some(keyword => lowerLine.includes(keyword)) && !result.title) {
        result.title = line
        continue
      }

      // Check if this line contains company keywords
      if (companyKeywords.some(keyword => lowerLine.includes(keyword)) && !result.company) {
        result.company = line
        continue
      }

      // If no specific keywords, use heuristics
      // Lines with "LLC", "Inc", etc. are likely companies
      if (/\b(llc|inc|corp|ltd|group|team|partners|associates)\b/i.test(line) && !result.company) {
        result.company = line
      }
    }

    return result
  }

  /**
   * Extract address information
   */
  private static extractAddress(lines: string[]): string | undefined {
    // Look for lines that contain address patterns
    for (const line of lines) {
      // Skip if it's contact info
      if (this.EMAIL_REGEX.test(line) || this.PHONE_REGEX.test(line) || this.URL_REGEX.test(line)) {
        continue
      }

      // Look for address patterns (street number + name, or city/state/zip)
      const addressPatterns = [
        /\d+\s+[A-Za-z\s]+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)/i,
        /[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(-\d{4})?/
      ]

      if (addressPatterns.some(pattern => pattern.test(line))) {
        return line
      }
    }

    return undefined
  }

  /**
   * Format phone number to standard format
   */
  private static formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    } else if (digits.length === 11 && digits[0] === '1') {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    }
    
    return phone // Return original if can't format
  }

  /**
   * Validate extracted data quality
   */
  static validateExtractedData(data: BusinessCardData): { isValid: boolean, confidence: number, errors: string[] } {
    const errors: string[] = []
    let confidence = 0

    // Check for essential fields
    if (data.name) confidence += 30
    else errors.push('Name not found')

    if (data.email && this.EMAIL_REGEX.test(data.email)) confidence += 25
    else if (data.email) errors.push('Invalid email format')

    if (data.phone) confidence += 20

    if (data.company) confidence += 15

    if (data.title) confidence += 10

    const isValid = !!(confidence >= 50 && (data.name || data.email))

    return { isValid, confidence, errors }
  }

  /**
   * Process business card image and extract contact information
   */
  static async processBusinessCard(imageData: string, format: string): Promise<BusinessCardScanResult> {
    const startTime = Date.now()

    try {
      // Perform OCR
      const ocrText = await this.performOCR(imageData, format)
      
      if (!ocrText || ocrText.trim().length === 0) {
        return {
          success: false,
          errors: ['No text detected in image'],
          confidence: 0,
          source: 'business-card',
          ocrText,
          processingTime: Date.now() - startTime
        }
      }

      // Extract structured data
      const contactData = this.extractContactInfo(ocrText)
      
      // Validate data quality
      const validation = this.validateExtractedData(contactData)

      return {
        success: validation.isValid,
        data: contactData,
        errors: validation.errors,
        confidence: validation.confidence,
        source: 'business-card',
        ocrText,
        processingTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Processing failed'],
        confidence: 0,
        source: 'business-card',
        processingTime: Date.now() - startTime
      }
    }
  }
}