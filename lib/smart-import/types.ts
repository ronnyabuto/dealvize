// Smart Import feature types and interfaces
export interface BusinessCardData {
  name?: string
  title?: string
  company?: string
  email?: string
  phone?: string
  address?: string
  website?: string
  linkedin?: string
  notes?: string
}

export interface PropertyDetails {
  address: string
  price?: number
  bedrooms?: number
  bathrooms?: number
  sqft?: number
  lotSize?: number
  yearBuilt?: number
  propertyType?: string
  listingId?: string
  mlsNumber?: string
  description?: string
  features?: string[]
  agentInfo?: {
    name?: string
    email?: string
    phone?: string
    company?: string
  }
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  location?: string
  attendees?: string[]
  eventType?: 'showing' | 'meeting' | 'call' | 'inspection' | 'closing' | 'other'
}

export interface SmartImportResult<T = unknown> {
  success: boolean
  data?: T
  errors?: string[]
  warnings?: string[]
  confidence?: number
  source: 'business-card' | 'email' | 'calendar' | 'manual'
}

export interface BusinessCardScanResult extends SmartImportResult<BusinessCardData> {
  ocrText?: string
  processingTime?: number
}

export interface EmailParseResult extends SmartImportResult<PropertyDetails> {
  rawEmail?: {
    subject: string
    body: string
    sender: string
    timestamp: Date
  }
}

export interface CalendarImportResult extends SmartImportResult<CalendarEvent[]> {
  tasksCreated?: number
  clientsLinked?: number
}

// Configuration interfaces
export interface SmartImportConfig {
  businessCard: {
    enabled: boolean
    ocrProvider: 'tesseract' | 'google-vision' | 'azure-cognitive'
    confidence: number
  }
  email: {
    enabled: boolean
    autoProcessIncoming: boolean
    mlsPatterns: string[]
    propertyKeywords: string[]
  }
  calendar: {
    enabled: boolean
    providers: ('google' | 'outlook' | 'apple')[]
    autoCreateTasks: boolean
    defaultTaskPriority: 'Low' | 'Medium' | 'High'
  }
}

// API Request/Response types
export interface ProcessBusinessCardRequest {
  imageData: string // base64 encoded image
  format: 'jpeg' | 'png' | 'webp'
  options?: {
    enhance?: boolean
    skipOcr?: boolean
  }
}

export interface ParseEmailRequest {
  emailContent: string
  emailMetadata?: {
    subject: string
    sender: string
    timestamp: string
    headers?: Record<string, string>
  }
}

export interface ImportCalendarRequest {
  provider: 'google' | 'outlook' | 'apple'
  accessToken: string
  dateRange?: {
    start: Date
    end: Date
  }
  eventTypes?: string[]
}