import { PropertyDetails, EmailParseResult } from '@/lib/smart-import/types'

/**
 * Email Parser Service
 * Extracts property details from real estate listing emails
 */
export class EmailParser {
  private static readonly PRICE_REGEX = /\$[\d,]+(?:\.\d{2})?/g
  private static readonly ADDRESS_REGEX = /\b\d+\s+[A-Za-z0-9\s.,#-]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|circle|cir|court|ct|place|pl|way|pkwy|parkway)\b/gi
  private static readonly BEDS_BATHS_REGEX = /(\d+)\s*(?:bed|bedroom|br|bd)s?\s*(?:[\s,/&-]+(\d+(?:\.\d)?)\s*(?:bath|bathroom|ba)s?)?/gi
  private static readonly SQFT_REGEX = /(\d{1,3}(?:,\d{3})*)\s*(?:sq\.?\s*ft\.?|square\s*feet|sqft)/gi
  private static readonly YEAR_REGEX = /(?:built|year)\s*:?\s*(\d{4})/gi
  private static readonly LOT_SIZE_REGEX = /(\d+(?:\.\d+)?)\s*(?:acre|ac|sq\.?\s*ft\.?)\s*lot/gi
  private static readonly MLS_REGEX = /(?:mls|listing)\s*#?\s*:?\s*([A-Z0-9-]+)/gi

  // Real estate keywords for content detection
  private static readonly REAL_ESTATE_KEYWORDS = [
    'listing', 'property', 'home', 'house', 'real estate', 'mls',
    'bedroom', 'bathroom', 'square feet', 'sqft', 'lot size',
    'price', 'listing agent', 'showing', 'open house', 'for sale'
  ]

  // Property type keywords
  private static readonly PROPERTY_TYPES = [
    'single family', 'condo', 'condominium', 'townhouse', 'duplex',
    'multi-family', 'commercial', 'land', 'vacant lot', 'mobile home',
    'manufactured home', 'apartment', 'office', 'retail', 'industrial'
  ]

  /**
   * Parse email content to extract property details
   */
  static parsePropertyEmail(emailContent: string, emailMetadata?: {
    subject: string
    sender: string
    timestamp: string
  }): EmailParseResult {
    try {
      // First, check if this is likely a real estate email
      const confidence = this.calculateRealEstateConfidence(emailContent, emailMetadata?.subject)
      
      if (confidence < 30) {
        return {
          success: false,
          errors: ['Email does not appear to contain real estate listing information'],
          confidence,
          source: 'email',
          rawEmail: emailMetadata ? {
            subject: emailMetadata.subject,
            body: emailContent,
            sender: emailMetadata.sender,
            timestamp: new Date(emailMetadata.timestamp)
          } : undefined
        }
      }

      // Extract property details
      const propertyDetails = this.extractPropertyDetails(emailContent, emailMetadata)
      
      // Validate extracted data
      const validation = this.validatePropertyData(propertyDetails)

      return {
        success: validation.isValid,
        data: propertyDetails,
        errors: validation.errors,
        warnings: validation.warnings,
        confidence,
        source: 'email',
        rawEmail: emailMetadata ? {
          subject: emailMetadata.subject,
          body: emailContent,
          sender: emailMetadata.sender,
          timestamp: new Date(emailMetadata.timestamp)
        } : undefined
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Email parsing failed'],
        confidence: 0,
        source: 'email'
      }
    }
  }

  /**
   * Calculate confidence that email contains real estate information
   */
  private static calculateRealEstateConfidence(content: string, subject?: string): number {
    let confidence = 0
    const lowerContent = content.toLowerCase()
    const lowerSubject = subject?.toLowerCase() || ''

    // Check for real estate keywords
    const keywordMatches = this.REAL_ESTATE_KEYWORDS.filter(keyword => 
      lowerContent.includes(keyword) || lowerSubject.includes(keyword)
    ).length

    confidence += Math.min(keywordMatches * 10, 40)

    // Check for price patterns
    if (this.PRICE_REGEX.test(content)) confidence += 20

    // Check for address patterns
    if (this.ADDRESS_REGEX.test(content)) confidence += 15

    // Check for bedroom/bathroom patterns
    if (this.BEDS_BATHS_REGEX.test(content)) confidence += 15

    // Check for square footage patterns
    if (this.SQFT_REGEX.test(content)) confidence += 10

    return Math.min(confidence, 100)
  }

  /**
   * Extract detailed property information from email content
   */
  private static extractPropertyDetails(content: string, metadata?: {
    subject: string
    sender: string
    timestamp: string
  }): PropertyDetails {
    const details: PropertyDetails = {
      address: ''
    }

    // Extract address (primary identifier)
    const addressMatch = content.match(this.ADDRESS_REGEX)
    if (addressMatch && addressMatch.length > 0) {
      details.address = addressMatch[0].trim()
    }

    // Extract price
    const priceMatches = content.match(this.PRICE_REGEX)
    if (priceMatches && priceMatches.length > 0) {
      const priceStr = priceMatches[0].replace(/[$,]/g, '')
      const price = parseFloat(priceStr)
      if (!isNaN(price) && price > 1000) { // Reasonable price threshold
        details.price = price
      }
    }

    // Extract bedrooms and bathrooms
    const bedsAndBaths = this.extractBedsAndBaths(content)
    details.bedrooms = bedsAndBaths.bedrooms
    details.bathrooms = bedsAndBaths.bathrooms

    // Extract square footage
    const sqftMatch = content.match(this.SQFT_REGEX)
    if (sqftMatch) {
      const sqftStr = sqftMatch[1].replace(/,/g, '')
      const sqft = parseInt(sqftStr)
      if (!isNaN(sqft) && sqft > 100) { // Reasonable sqft threshold
        details.sqft = sqft
      }
    }

    // Extract year built
    const yearMatch = content.match(this.YEAR_REGEX)
    if (yearMatch) {
      const year = parseInt(yearMatch[1])
      if (year >= 1800 && year <= new Date().getFullYear()) {
        details.yearBuilt = year
      }
    }

    // Extract lot size
    const lotMatch = content.match(this.LOT_SIZE_REGEX)
    if (lotMatch) {
      const lotSize = parseFloat(lotMatch[1])
      if (!isNaN(lotSize)) {
        details.lotSize = lotSize
      }
    }

    // Extract MLS number
    const mlsMatch = content.match(this.MLS_REGEX)
    if (mlsMatch) {
      details.mlsNumber = mlsMatch[1]
    }

    // Extract property type
    details.propertyType = this.extractPropertyType(content)

    // Extract agent information
    details.agentInfo = this.extractAgentInfo(content, metadata?.sender)

    // Extract description (first substantial paragraph that's not contact info)
    details.description = this.extractDescription(content)

    // Extract features
    details.features = this.extractFeatures(content)

    return details
  }

  /**
   * Extract bedrooms and bathrooms with various format support
   */
  private static extractBedsAndBaths(content: string): { bedrooms?: number, bathrooms?: number } {
    const result: { bedrooms?: number, bathrooms?: number } = {}

    // Reset regex to ensure we get all matches
    this.BEDS_BATHS_REGEX.lastIndex = 0
    
    const matches = [...content.matchAll(this.BEDS_BATHS_REGEX)]
    
    for (const match of matches) {
      if (match[1]) {
        const beds = parseInt(match[1])
        if (!isNaN(beds) && beds > 0 && beds <= 20) {
          result.bedrooms = beds
        }
      }
      
      if (match[2]) {
        const baths = parseFloat(match[2])
        if (!isNaN(baths) && baths > 0 && baths <= 20) {
          result.bathrooms = baths
        }
      }
    }

    return result
  }

  /**
   * Extract property type from content
   */
  private static extractPropertyType(content: string): string | undefined {
    const lowerContent = content.toLowerCase()
    
    for (const type of this.PROPERTY_TYPES) {
      if (lowerContent.includes(type)) {
        return type.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
      }
    }

    return undefined
  }

  /**
   * Extract agent information from email content
   */
  private static extractAgentInfo(content: string, senderEmail?: string): PropertyDetails['agentInfo'] {
    const agentInfo: PropertyDetails['agentInfo'] = {}

    if (senderEmail) {
      agentInfo.email = senderEmail
    }

    // Look for agent name patterns
    const agentPatterns = [
      /(?:agent|realtor|broker)\s*:?\s*([A-Za-z\s]+)/i,
      /(?:listed\s+by|contact)\s*:?\s*([A-Za-z\s]+)/i,
      /([A-Za-z\s]+)\s*(?:realtor|agent|broker)/i
    ]

    for (const pattern of agentPatterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        agentInfo.name = match[1].trim()
        break
      }
    }

    // Extract phone number
    const phoneMatch = content.match(/(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/)
    if (phoneMatch) {
      agentInfo.phone = phoneMatch[0]
    }

    // Extract company
    const companyPatterns = [
      /(?:brokered\s+by|company)\s*:?\s*([A-Za-z\s&,.-]+)(?:\n|$)/i,
      /([A-Za-z\s&,.-]+)\s*(?:realty|real estate|properties|group)/i
    ]

    for (const pattern of companyPatterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        agentInfo.company = match[1].trim()
        break
      }
    }

    return Object.keys(agentInfo).length > 0 ? agentInfo : undefined
  }

  /**
   * Extract property description from email
   */
  private static extractDescription(content: string): string | undefined {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 20)
    
    // Look for paragraphs that don't contain contact info or technical details
    for (const line of lines) {
      if (
        !line.includes('@') && // No email
        !line.match(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/) && // No phone
        !line.includes('MLS') && // No MLS info
        line.length > 50 && // Substantial content
        line.includes(' ') // Multiple words
      ) {
        return line.substring(0, 500) // Limit description length
      }
    }

    return undefined
  }

  /**
   * Extract property features from email content
   */
  private static extractFeatures(content: string): string[] {
    const features: string[] = []
    const lowerContent = content.toLowerCase()

    const featureKeywords = [
      'pool', 'swimming pool', 'hot tub', 'spa', 'garage', 'parking',
      'fireplace', 'hardwood floors', 'tile', 'carpet', 'granite',
      'marble', 'stainless steel', 'updated kitchen', 'master suite',
      'walk-in closet', 'balcony', 'patio', 'deck', 'yard', 'garden',
      'fenced', 'central air', 'ac', 'heating', 'dishwasher', 'washer',
      'dryer', 'refrigerator', 'basement', 'attic', 'storage'
    ]

    for (const keyword of featureKeywords) {
      if (lowerContent.includes(keyword)) {
        features.push(keyword.charAt(0).toUpperCase() + keyword.slice(1))
      }
    }

    return [...new Set(features)] // Remove duplicates
  }

  /**
   * Validate extracted property data
   */
  private static validatePropertyData(data: PropertyDetails): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check required fields
    if (!data.address || data.address.length < 5) {
      errors.push('Property address is required')
    }

    // Validate price
    if (data.price !== undefined && (data.price < 1000 || data.price > 50000000)) {
      warnings.push('Property price seems unusual')
    }

    // Validate bedrooms/bathrooms
    if (data.bedrooms !== undefined && (data.bedrooms < 0 || data.bedrooms > 20)) {
      warnings.push('Number of bedrooms seems unusual')
    }

    if (data.bathrooms !== undefined && (data.bathrooms < 0 || data.bathrooms > 20)) {
      warnings.push('Number of bathrooms seems unusual')
    }

    // Validate square footage
    if (data.sqft !== undefined && (data.sqft < 100 || data.sqft > 50000)) {
      warnings.push('Square footage seems unusual')
    }

    const isValid = errors.length === 0 && data.address.length > 0

    return { isValid, errors, warnings }
  }

  /**
   * Check if email is from known real estate platforms
   */
  static isFromRealEstatePlatform(senderEmail: string): boolean {
    const platforms = [
      'zillow.com', 'realtor.com', 'redfin.com', 'coldwellbanker.com',
      're/max.com', 'century21.com', 'kw.com', 'sothebysrealty.com',
      'compass.com', 'trulia.com', 'homes.com', 'homesnap.com'
    ]

    return platforms.some(platform => senderEmail.toLowerCase().includes(platform))
  }

  /**
   * Extract multiple property listings from a single email (for bulk emails)
   */
  static parseMultipleListings(emailContent: string): PropertyDetails[] {
    const listings: PropertyDetails[] = []
    
    // Split content by common separators
    const sections = emailContent.split(/(?:\n\s*\n|\r\n\s*\r\n|[-=]{3,})/g)
    
    for (const section of sections) {
      if (section.trim().length < 50) continue
      
      const confidence = this.calculateRealEstateConfidence(section)
      if (confidence >= 30) {
        const property = this.extractPropertyDetails(section)
        if (property.address) {
          listings.push(property)
        }
      }
    }
    
    return listings
  }
}