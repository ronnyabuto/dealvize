import { z } from 'zod'
import { PropertyType, StandardStatus, MLSSortField } from './types'

/**
 * MLS Data Validation Schemas
 * Ensures data integrity and type safety for MLS operations
 */

// Base validation schemas
const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
})

const addressSchema = z.object({
  streetNumber: z.string().optional(),
  streetName: z.string().optional(),
  streetSuffix: z.string().optional(),
  unitNumber: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  stateOrProvince: z.string().length(2, 'State must be 2 characters'),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
  county: z.string().optional(),
  country: z.string().default('US')
})

// MLS Property validation schema
export const mlsPropertySchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
  listingKey: z.string().optional(),
  propertyType: z.nativeEnum(PropertyType),
  propertySubType: z.string().optional(),
  
  address: addressSchema,
  coordinates: coordinatesSchema.optional(),
  
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().min(0).max(50).optional(),
  bathroomsFull: z.number().int().min(0).max(50).optional(),
  bathroomsHalf: z.number().int().min(0).max(50).optional(),
  squareFeet: z.number().int().min(1).max(100000).optional(),
  lotSizeSquareFeet: z.number().int().min(1).optional(),
  lotSizeAcres: z.number().min(0.01).optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 2).optional(),
  
  listPrice: z.number().min(0, 'List price must be positive'),
  originalListPrice: z.number().min(0).optional(),
  previousListPrice: z.number().min(0).optional(),
  priceChangeTimestamp: z.date().optional(),
  
  standardStatus: z.nativeEnum(StandardStatus),
  mlsStatus: z.string().optional(),
  listingContractDate: z.date().optional(),
  onMarketDate: z.date().optional(),
  offMarketDate: z.date().optional(),
  closeDate: z.date().optional(),
  expirationDate: z.date().optional(),
  
  publicRemarks: z.string().max(8000).optional(),
  privateRemarks: z.string().max(8000).optional(),
  keywordsDescription: z.string().max(1000).optional(),
  
  modificationTimestamp: z.date(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

// Search criteria validation
export const mlsSearchCriteriaSchema = z.object({
  // Location filters
  city: z.array(z.string()).optional(),
  postalCode: z.array(z.string().regex(/^\d{5}(-\d{4})?$/)).optional(),
  county: z.array(z.string()).optional(),
  coordinates: z.object({
    northEast: coordinatesSchema,
    southWest: coordinatesSchema
  }).optional(),
  
  // Property filters
  propertyType: z.array(z.nativeEnum(PropertyType)).optional(),
  minBedrooms: z.number().int().min(0).max(50).optional(),
  maxBedrooms: z.number().int().min(0).max(50).optional(),
  minBathrooms: z.number().min(0).max(50).optional(),
  maxBathrooms: z.number().min(0).max(50).optional(),
  minSquareFeet: z.number().int().min(1).optional(),
  maxSquareFeet: z.number().int().min(1).optional(),
  minLotSize: z.number().min(0).optional(),
  maxLotSize: z.number().min(0).optional(),
  minYearBuilt: z.number().int().min(1800).optional(),
  maxYearBuilt: z.number().int().max(new Date().getFullYear() + 2).optional(),
  
  // Price filters
  minListPrice: z.number().min(0).optional(),
  maxListPrice: z.number().min(0).optional(),
  
  // Status filters
  standardStatus: z.array(z.nativeEnum(StandardStatus)).optional(),
  
  // Date filters
  minOnMarketDate: z.date().optional(),
  maxOnMarketDate: z.date().optional(),
  modifiedSince: z.date().optional(),
  
  // Search options
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
  sortBy: z.nativeEnum(MLSSortField).default(MLSSortField.MODIFICATION_TIMESTAMP),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
}).refine((data) => {
  // Validate min/max ranges
  if (data.minListPrice && data.maxListPrice && data.minListPrice > data.maxListPrice) {
    return false
  }
  if (data.minBedrooms && data.maxBedrooms && data.minBedrooms > data.maxBedrooms) {
    return false
  }
  if (data.minBathrooms && data.maxBathrooms && data.minBathrooms > data.maxBathrooms) {
    return false
  }
  if (data.minSquareFeet && data.maxSquareFeet && data.minSquareFeet > data.maxSquareFeet) {
    return false
  }
  if (data.minYearBuilt && data.maxYearBuilt && data.minYearBuilt > data.maxYearBuilt) {
    return false
  }
  return true
}, {
  message: "Minimum values cannot be greater than maximum values"
})

// MLS Configuration validation
export const mlsConfigSchema = z.object({
  provider: z.enum(['CMLS', 'RESO', 'BRIDGE', 'SPARK', 'TRESTLE']),
  environment: z.enum(['sandbox', 'production']),
  credentials: z.object({
    clientId: z.string().min(1, 'Client ID is required'),
    clientSecret: z.string().min(1, 'Client secret is required'),
    username: z.string().optional(),
    password: z.string().optional(),
    loginUrl: z.string().url().optional(),
    apiUrl: z.string().url('Invalid API URL')
  }),
  rateLimiting: z.object({
    requestsPerMinute: z.number().int().min(1).max(1000),
    requestsPerHour: z.number().int().min(1).max(10000),
    requestsPerDay: z.number().int().min(1).max(100000)
  }),
  caching: z.object({
    propertyCacheTTL: z.number().int().min(60).max(86400), // 1 minute to 24 hours
    searchCacheTTL: z.number().int().min(30).max(3600),    // 30 seconds to 1 hour
    photosCacheTTL: z.number().int().min(300).max(604800)   // 5 minutes to 7 days
  })
})

/**
 * Data Transformation Utilities
 */

export class MLSDataTransformer {
  /**
   * Transform raw MLS API response to our standardized format
   */
  static transformRawProperty(rawData: any): z.infer<typeof mlsPropertySchema> | null {
    try {
      // Handle different MLS provider response formats
      const transformed = {
        listingId: rawData.ListingId || rawData.MlsNumber || rawData.id,
        listingKey: rawData.ListingKey || rawData.listing_key,
        propertyType: this.mapPropertyType(rawData.PropertyType || rawData.property_type),
        propertySubType: rawData.PropertySubType || rawData.property_sub_type,
        
        address: {
          streetNumber: rawData.StreetNumber || rawData.street_number,
          streetName: rawData.StreetName || rawData.street_name,
          streetSuffix: rawData.StreetSuffix || rawData.street_suffix,
          unitNumber: rawData.UnitNumber || rawData.unit_number,
          city: rawData.City || rawData.city,
          stateOrProvince: rawData.StateOrProvince || rawData.state || 'OH',
          postalCode: rawData.PostalCode || rawData.zip_code,
          county: rawData.CountyOrParish || rawData.county,
          country: 'US'
        },
        
        coordinates: (rawData.Latitude || rawData.Longitude) ? {
          latitude: parseFloat(rawData.Latitude || rawData.lat),
          longitude: parseFloat(rawData.Longitude || rawData.lng)
        } : undefined,
        
        bedrooms: this.parseNumber(rawData.BedroomsTotal || rawData.bedrooms),
        bathrooms: this.parseNumber(rawData.BathroomsTotal || rawData.bathrooms),
        bathroomsFull: this.parseNumber(rawData.BathroomsFull || rawData.bathrooms_full),
        bathroomsHalf: this.parseNumber(rawData.BathroomsHalf || rawData.bathrooms_half),
        squareFeet: this.parseNumber(rawData.LivingArea || rawData.square_feet || rawData.sqft),
        lotSizeSquareFeet: this.parseNumber(rawData.LotSizeSquareFeet || rawData.lot_size_sqft),
        lotSizeAcres: this.parseNumber(rawData.LotSizeAcres || rawData.lot_size_acres),
        yearBuilt: this.parseNumber(rawData.YearBuilt || rawData.year_built),
        
        listPrice: this.parseNumber(rawData.ListPrice || rawData.price) || 0,
        originalListPrice: this.parseNumber(rawData.OriginalListPrice || rawData.original_price),
        previousListPrice: this.parseNumber(rawData.PreviousListPrice || rawData.previous_price),
        priceChangeTimestamp: this.parseDate(rawData.PriceChangeTimestamp),
        
        standardStatus: this.mapStandardStatus(rawData.StandardStatus || rawData.status),
        mlsStatus: rawData.MlsStatus || rawData.mls_status,
        listingContractDate: this.parseDate(rawData.ListingContractDate || rawData.listing_date),
        onMarketDate: this.parseDate(rawData.OnMarketDate || rawData.on_market_date),
        offMarketDate: this.parseDate(rawData.OffMarketDate || rawData.off_market_date),
        closeDate: this.parseDate(rawData.CloseDate || rawData.close_date),
        expirationDate: this.parseDate(rawData.ExpirationDate || rawData.expiration_date),
        
        publicRemarks: rawData.PublicRemarks || rawData.description || rawData.remarks,
        privateRemarks: rawData.PrivateRemarks || rawData.private_remarks,
        keywordsDescription: rawData.KeywordsDescription || rawData.keywords,
        
        modificationTimestamp: this.parseDate(rawData.ModificationTimestamp || rawData.updated_at) || new Date(),
        createdAt: this.parseDate(rawData.CreatedAt || rawData.created_at),
        updatedAt: this.parseDate(rawData.UpdatedAt || rawData.updated_at)
      }
      
      // Validate the transformed data
      return mlsPropertySchema.parse(transformed)
    } catch (error) {
      console.error('Failed to transform MLS property data:', error)
      return null
    }
  }
  
  /**
   * Map various property type formats to our standard enum
   */
  private static mapPropertyType(rawType: string): PropertyType {
    if (!rawType) return PropertyType.RESIDENTIAL
    
    const type = rawType.toLowerCase().trim()
    
    if (type.includes('condo') || type.includes('condominium')) {
      return PropertyType.CONDO
    }
    if (type.includes('townhouse') || type.includes('town house')) {
      return PropertyType.TOWNHOUSE
    }
    if (type.includes('manufactured') || type.includes('mobile')) {
      return PropertyType.MANUFACTURED
    }
    if (type.includes('land') || type.includes('vacant')) {
      return PropertyType.LAND
    }
    if (type.includes('commercial') || type.includes('office') || type.includes('retail')) {
      return PropertyType.COMMERCIAL
    }
    if (type.includes('business')) {
      return PropertyType.BUSINESS_OPPORTUNITY
    }
    if (type.includes('rental') || type.includes('lease')) {
      return PropertyType.RENTAL
    }
    
    return PropertyType.RESIDENTIAL
  }
  
  /**
   * Map various status formats to our standard enum
   */
  private static mapStandardStatus(rawStatus: string): StandardStatus {
    if (!rawStatus) return StandardStatus.ACTIVE
    
    const status = rawStatus.toLowerCase().trim()
    
    if (status.includes('active') && status.includes('contract')) {
      return StandardStatus.ACTIVE_UNDER_CONTRACT
    }
    if (status.includes('active')) {
      return StandardStatus.ACTIVE
    }
    if (status.includes('pending')) {
      return StandardStatus.PENDING
    }
    if (status.includes('sold') || status.includes('closed')) {
      return StandardStatus.CLOSED
    }
    if (status.includes('expired')) {
      return StandardStatus.EXPIRED
    }
    if (status.includes('cancelled') || status.includes('canceled')) {
      return StandardStatus.CANCELED
    }
    if (status.includes('withdrawn')) {
      return StandardStatus.WITHDRAWN
    }
    if (status.includes('hold')) {
      return StandardStatus.HOLD
    }
    if (status.includes('incomplete')) {
      return StandardStatus.INCOMPLETE
    }
    
    return StandardStatus.ACTIVE
  }
  
  /**
   * Safely parse numbers from various formats
   */
  private static parseNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined
    }
    
    // Handle string numbers with commas or currency symbols
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,\s]/g, '')
      const parsed = parseFloat(cleaned)
      return isNaN(parsed) ? undefined : parsed
    }
    
    if (typeof value === 'number') {
      return isNaN(value) ? undefined : value
    }
    
    return undefined
  }
  
  /**
   * Safely parse dates from various formats
   */
  private static parseDate(value: any): Date | undefined {
    if (!value) return undefined
    
    try {
      const date = new Date(value)
      return isNaN(date.getTime()) ? undefined : date
    } catch {
      return undefined
    }
  }
}

/**
 * Address validation and formatting utilities
 */
export class AddressValidator {
  /**
   * Validate and format Columbus, Ohio addresses
   */
  static validateColumbusAddress(address: string): {
    isValid: boolean
    formatted?: string
    components?: {
      streetNumber?: string
      streetName?: string
      streetSuffix?: string
      city?: string
      state?: string
      zipCode?: string
    }
    errors?: string[]
  } {
    const errors: string[] = []
    
    if (!address || address.trim().length === 0) {
      return { isValid: false, errors: ['Address is required'] }
    }
    
    // Basic Columbus address pattern matching
    const addressPattern = /^(\d+)\s+([A-Za-z\s]+?)(?:\s+(St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Boulevard|Ct|Court|Pl|Place|Way|Pkwy|Parkway))?\s*,?\s*Columbus\s*,?\s*OH\s*(\d{5}(-\d{4})?)?$/i
    
    const match = address.match(addressPattern)
    
    if (!match) {
      // Try more flexible pattern without Columbus, OH
      const flexiblePattern = /^(\d+)\s+([A-Za-z\s]+?)(?:\s+(St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Boulevard|Ct|Court|Pl|Place|Way|Pkwy|Parkway))?\s*(\d{5}(-\d{4})?)?$/i
      const flexibleMatch = address.match(flexiblePattern)
      
      if (flexibleMatch) {
        const components = {
          streetNumber: flexibleMatch[1],
          streetName: flexibleMatch[2].trim(),
          streetSuffix: flexibleMatch[3] || '',
          city: 'Columbus',
          state: 'OH',
          zipCode: flexibleMatch[4] || ''
        }
        
        const formatted = this.formatAddress(components)
        return { isValid: true, formatted, components }
      }
      
      errors.push('Invalid address format for Columbus, OH')
      return { isValid: false, errors }
    }
    
    const components = {
      streetNumber: match[1],
      streetName: match[2].trim(),
      streetSuffix: match[3] || '',
      city: 'Columbus',
      state: 'OH',
      zipCode: match[4] || ''
    }
    
    // Validate ZIP code if provided
    if (components.zipCode && !this.isValidColumbusZip(components.zipCode)) {
      errors.push('Invalid ZIP code for Columbus, OH')
    }
    
    const formatted = this.formatAddress(components)
    
    return {
      isValid: errors.length === 0,
      formatted,
      components,
      errors: errors.length > 0 ? errors : undefined
    }
  }
  
  /**
   * Format address components into standardized string
   */
  private static formatAddress(components: {
    streetNumber?: string
    streetName?: string
    streetSuffix?: string
    city?: string
    state?: string
    zipCode?: string
  }): string {
    const parts: string[] = []
    
    if (components.streetNumber) {
      parts.push(components.streetNumber)
    }
    
    if (components.streetName) {
      parts.push(components.streetName)
    }
    
    if (components.streetSuffix) {
      parts.push(this.standardizeStreetSuffix(components.streetSuffix))
    }
    
    let addressLine = parts.join(' ')
    
    if (components.city) {
      addressLine += `, ${components.city}`
    }
    
    if (components.state) {
      addressLine += `, ${components.state.toUpperCase()}`
    }
    
    if (components.zipCode) {
      addressLine += ` ${components.zipCode}`
    }
    
    return addressLine.trim()
  }
  
  /**
   * Standardize street suffixes
   */
  private static standardizeStreetSuffix(suffix: string): string {
    const standardSuffixes: Record<string, string> = {
      'st': 'St',
      'street': 'St',
      'ave': 'Ave',
      'avenue': 'Ave',
      'rd': 'Rd',
      'road': 'Rd',
      'dr': 'Dr',
      'drive': 'Dr',
      'ln': 'Ln',
      'lane': 'Ln',
      'blvd': 'Blvd',
      'boulevard': 'Blvd',
      'ct': 'Ct',
      'court': 'Ct',
      'pl': 'Pl',
      'place': 'Pl',
      'way': 'Way',
      'pkwy': 'Pkwy',
      'parkway': 'Pkwy'
    }
    
    const lower = suffix.toLowerCase()
    return standardSuffixes[lower] || suffix
  }
  
  /**
   * Validate Columbus, OH ZIP codes
   */
  private static isValidColumbusZip(zipCode: string): boolean {
    // Columbus ZIP codes typically start with 432
    const columbusZips = /^432\d{2}(-\d{4})?$/
    return columbusZips.test(zipCode)
  }
}

/**
 * Validate MLS property data
 */
export function validateMLSProperty(propertyData: any): {
  isValid: boolean
  data?: z.infer<typeof mlsPropertySchema>
  errors?: string[]
} {
  try {
    const validatedData = mlsPropertySchema.parse(propertyData)
    return { isValid: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      }
    }
    return {
      isValid: false,
      errors: ['Unknown validation error']
    }
  }
}