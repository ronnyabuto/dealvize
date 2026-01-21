/**
 * MLS Integration Types and Interfaces
 * Columbus MLS (CMLS) and RESO Standard Compliance
 */

// RESO Standard Property Resource Types
export interface MLSProperty {
  // Core Property Identifiers
  listingId: string                    // MLS Number
  listingKey?: string                  // RESO ListingKey
  propertyType: PropertyType
  propertySubType?: string
  
  // Location Data
  address: {
    streetNumber?: string
    streetName?: string
    streetSuffix?: string
    unitNumber?: string
    city: string
    stateOrProvince: string
    postalCode: string
    county?: string
    country?: string
  }
  
  // Geographic Coordinates
  coordinates?: {
    latitude: number
    longitude: number
  }
  
  // Property Details
  bedrooms?: number
  bathrooms?: number
  bathroomsFull?: number
  bathroomsHalf?: number
  squareFeet?: number
  lotSizeSquareFeet?: number
  lotSizeAcres?: number
  yearBuilt?: number
  
  // Listing Information
  listPrice: number
  originalListPrice?: number
  previousListPrice?: number
  priceChangeTimestamp?: Date
  
  // Status and Dates
  standardStatus: StandardStatus
  mlsStatus?: string
  listingContractDate?: Date
  onMarketDate?: Date
  offMarketDate?: Date
  closeDate?: Date
  expirationDate?: Date
  
  // Property Description
  publicRemarks?: string
  privateRemarks?: string
  keywordsDescription?: string
  
  // Media
  photos?: MLSPhoto[]
  virtualTours?: MLSVirtualTour[]
  documents?: MLSDocument[]
  
  // Agent/Office Information
  listingAgent?: MLSAgent
  buyerAgent?: MLSAgent
  listingOffice?: MLSOffice
  buyerOffice?: MLSOffice
  
  // Additional Property Features
  appliances?: string[]
  heating?: string[]
  cooling?: string[]
  parking?: {
    totalSpaces?: number
    garageSpaces?: number
    parkingFeatures?: string[]
  }
  
  // HOA Information
  hoa?: {
    fee?: number
    feeFrequency?: string
    amenities?: string[]
  }
  
  // Financial Information
  taxes?: {
    amount?: number
    year?: number
    taxId?: string
  }
  
  // School Information (Columbus specific)
  schools?: {
    elementary?: string
    middle?: string
    high?: string
    district?: string
  }
  
  // Timestamps
  modificationTimestamp: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface MLSPhoto {
  url: string
  order: number
  caption?: string
  modificationTimestamp?: Date
}

export interface MLSVirtualTour {
  url: string
  type?: 'Unbranded' | 'Branded' | 'Matterport'
}

export interface MLSDocument {
  url: string
  name: string
  type?: string
}

export interface MLSAgent {
  id: string
  name: string
  email?: string
  phone?: string
  mlsId?: string
  licenseNumber?: string
}

export interface MLSOffice {
  id: string
  name: string
  phone?: string
  mlsId?: string
}

// RESO Standard Enums
export enum PropertyType {
  RESIDENTIAL = 'Residential',
  CONDO = 'Condo',
  TOWNHOUSE = 'Townhouse',
  MANUFACTURED = 'Manufactured',
  LAND = 'Land',
  COMMERCIAL = 'Commercial',
  BUSINESS_OPPORTUNITY = 'Business Opportunity',
  RENTAL = 'Rental'
}

export enum StandardStatus {
  ACTIVE = 'Active',
  ACTIVE_UNDER_CONTRACT = 'Active Under Contract',
  CANCELED = 'Canceled',
  CLOSED = 'Closed',
  EXPIRED = 'Expired',
  HOLD = 'Hold',
  INCOMPLETE = 'Incomplete',
  PENDING = 'Pending',
  WITHDRAWN = 'Withdrawn'
}

// Search and Filter Types
export interface MLSSearchCriteria {
  // Location Filters
  city?: string[]
  postalCode?: string[]
  county?: string[]
  coordinates?: {
    northEast: { lat: number; lng: number }
    southWest: { lat: number; lng: number }
  }
  
  // Property Filters
  propertyType?: PropertyType[]
  minBedrooms?: number
  maxBedrooms?: number
  minBathrooms?: number
  maxBathrooms?: number
  minSquareFeet?: number
  maxSquareFeet?: number
  minLotSize?: number
  maxLotSize?: number
  minYearBuilt?: number
  maxYearBuilt?: number
  
  // Price Filters
  minListPrice?: number
  maxListPrice?: number
  
  // Status Filters
  standardStatus?: StandardStatus[]
  
  // Date Filters
  minOnMarketDate?: Date
  maxOnMarketDate?: Date
  modifiedSince?: Date
  
  // Search Options
  limit?: number
  offset?: number
  sortBy?: MLSSortField
  sortOrder?: 'asc' | 'desc'
}

export enum MLSSortField {
  LIST_PRICE = 'ListPrice',
  SQUARE_FEET = 'LivingArea',
  BEDROOMS = 'BedroomsTotal',
  BATHROOMS = 'BathroomsTotal',
  ON_MARKET_DATE = 'OnMarketDate',
  MODIFICATION_TIMESTAMP = 'ModificationTimestamp'
}

export interface MLSSearchResult {
  properties: MLSProperty[]
  totalCount: number
  hasMore: boolean
  nextOffset?: number
  searchId?: string
}

// Market Analysis Types
export interface MLSComparableProperty extends MLSProperty {
  distance?: number // Distance in miles from subject property
  adjustments?: {
    pricePerSqft?: number
    adjustedPrice?: number
    adjustmentFactors?: Record<string, number>
  }
}

export interface MLSMarketAnalysis {
  subjectProperty: {
    address: string
    coordinates?: { latitude: number; longitude: number }
  }
  comparables: MLSComparableProperty[]
  marketStatistics: {
    averageListPrice: number
    medianListPrice: number
    averagePricePerSqft: number
    averageDaysOnMarket: number
    totalActiveListings: number
    soldLast30Days: number
    soldLast90Days: number
  }
  priceEstimate?: {
    low: number
    high: number
    estimate: number
    confidence: number
  }
}

export interface MLSPropertyHistory {
  listingId: string
  events: MLSHistoryEvent[]
}

export interface MLSHistoryEvent {
  date: Date
  event: 'Listed' | 'Price Change' | 'Status Change' | 'Sold' | 'Expired' | 'Withdrawn'
  details: {
    previousValue?: string | number
    newValue?: string | number
    description?: string
  }
}

// API Configuration Types
export interface MLSConfig {
  provider: MLSProvider
  environment: 'sandbox' | 'production'
  credentials: {
    clientId: string
    clientSecret: string
    username?: string
    password?: string
    loginUrl?: string
    apiUrl: string
  }
  rateLimiting: {
    requestsPerMinute: number
    requestsPerHour: number
    requestsPerDay: number
  }
  caching: {
    propertyCacheTTL: number // seconds
    searchCacheTTL: number   // seconds
    photosCacheTTL: number   // seconds
  }
}

export enum MLSProvider {
  CMLS = 'CMLS',           // Columbus MLS
  RESO = 'RESO',           // RESO Web API
  BRIDGE = 'BRIDGE',       // Bridge Interactive
  SPARK = 'SPARK',         // Spark Platform
  TRESTLE = 'TRESTLE'      // Trestle
}

// API Response Types
export interface MLSApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  metadata?: {
    requestId: string
    timestamp: Date
    rateLimit?: {
      remaining: number
      resetTime: Date
    }
  }
}

export interface MLSAuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  refreshToken?: string
  scope?: string
}

// Integration Status Types
export interface MLSIntegrationStatus {
  isConnected: boolean
  lastSync?: Date
  apiStatus: 'healthy' | 'degraded' | 'down'
  authStatus: 'valid' | 'expired' | 'invalid'
  rateLimitStatus: {
    remainingRequests: number
    resetTime: Date
  }
  errors?: string[]
}

// Columbus-specific Types
export interface ColumbusMLSExtensions {
  // Columbus school district information
  schoolDistrict?: {
    name: string
    rating?: number
    website?: string
  }
  
  // Columbus neighborhood data
  neighborhood?: {
    name: string
    averageHomeValue?: number
    crimeRating?: string
    walkScore?: number
  }
  
  // Columbus market trends
  marketTrends?: {
    priceAppreciation1Year?: number
    priceAppreciation5Year?: number
    inventoryLevel?: 'Low' | 'Medium' | 'High'
    daysOnMarketTrend?: 'Increasing' | 'Decreasing' | 'Stable'
  }
}

// User Settings and Preferences
export interface MLSUserSettings {
  userId: string
  defaultSearchRadius: number // miles
  preferredPropertyTypes: PropertyType[]
  priceRange: {
    min?: number
    max?: number
  }
  notifications: {
    newListings: boolean
    priceChanges: boolean
    statusChanges: boolean
    marketReports: boolean
  }
  savedSearches: MLSSavedSearch[]
}

export interface MLSSavedSearch {
  id: string
  name: string
  criteria: MLSSearchCriteria
  notifications: boolean
  createdAt: Date
  lastRun?: Date
}

// All types are already exported with their declarations above