'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Upload, 
  Scan, 
  Mail, 
  Calendar, 
  Camera, 
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Import,
  Sparkles,
  Users,
  Building,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { BusinessCardData, PropertyDetails, CalendarEvent } from '@/lib/smart-import/types'

interface SmartImportDialogProps {
  onClientCreated?: (client: any) => void
  onDealCreated?: (deal: any) => void
  onTasksCreated?: (tasks: any[]) => void
  trigger?: React.ReactNode
}

type ImportType = 'business-card' | 'email' | 'calendar'
type ProcessingStep = 'idle' | 'uploading' | 'processing' | 'analyzing' | 'creating' | 'complete'

interface ProcessingState {
  step: ProcessingStep
  progress: number
  message: string
  errors: string[]
  warnings: string[]
}

export function SmartImportDialog({ 
  onClientCreated, 
  onDealCreated, 
  onTasksCreated,
  trigger 
}: SmartImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ImportType>('business-card')
  const [processing, setProcessing] = useState<ProcessingState>({
    step: 'idle',
    progress: 0,
    message: '',
    errors: [],
    warnings: []
  })

  // Business Card states
  const [businessCardFile, setBusinessCardFile] = useState<File | null>(null)
  const [businessCardPreview, setBusinessCardPreview] = useState<string | null>(null)
  const [extractedContactData, setExtractedContactData] = useState<BusinessCardData | null>(null)

  // Email states
  const [emailContent, setEmailContent] = useState('')
  const [emailMetadata, setEmailMetadata] = useState({
    subject: '',
    sender: '',
    timestamp: new Date().toISOString()
  })
  const [extractedPropertyData, setExtractedPropertyData] = useState<PropertyDetails | null>(null)

  // Calendar states
  const [calendarProvider, setCalendarProvider] = useState<'google' | 'outlook'>('google')
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])

  const businessCardInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setProcessing({
      step: 'idle',
      progress: 0,
      message: '',
      errors: [],
      warnings: []
    })
    setBusinessCardFile(null)
    setBusinessCardPreview(null)
    setExtractedContactData(null)
    setEmailContent('')
    setExtractedPropertyData(null)
    setCalendarEvents([])
    setSelectedEvents([])
  }

  const updateProcessing = (update: Partial<ProcessingState>) => {
    setProcessing(prev => ({ ...prev, ...update }))
  }

  // Business Card Processing
  const handleBusinessCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    setBusinessCardFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setBusinessCardPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const processBusinessCard = async () => {
    if (!businessCardFile) return

    updateProcessing({
      step: 'uploading',
      progress: 10,
      message: 'Uploading business card image...',
      errors: [],
      warnings: []
    })

    try {
      const formData = new FormData()
      formData.append('image', businessCardFile)

      updateProcessing({
        step: 'processing',
        progress: 30,
        message: 'Performing OCR and text extraction...'
      })

      const response = await fetch('/api/smart-import/business-card', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to process business card')
      }

      const result = await response.json()

      updateProcessing({
        step: 'analyzing',
        progress: 70,
        message: 'Extracting contact information...'
      })

      if (result.success) {
        setExtractedContactData(result.data)
        updateProcessing({
          step: 'complete',
          progress: 100,
          message: 'Business card processed successfully',
          warnings: result.warnings || []
        })
      } else {
        updateProcessing({
          step: 'idle',
          progress: 0,
          message: '',
          errors: result.errors || ['Processing failed']
        })
      }
    } catch (error) {
      updateProcessing({
        step: 'idle',
        progress: 0,
        message: '',
        errors: [error instanceof Error ? error.message : 'Processing failed']
      })
    }
  }

  const createClientFromBusinessCard = async () => {
    if (!extractedContactData) return

    updateProcessing({
      step: 'creating',
      progress: 90,
      message: 'Creating client record...'
    })

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: extractedContactData.name,
          email: extractedContactData.email,
          phone: extractedContactData.phone,
          address: extractedContactData.address,
          company: extractedContactData.company,
          status: 'Buyer' // Default status
        })
      })

      if (response.ok) {
        const client = await response.json()
        onClientCreated?.(client)
        toast.success('Client created successfully from business card')
        updateProcessing({
          step: 'complete',
          progress: 100,
          message: 'Client created successfully'
        })
        setTimeout(() => {
          setIsOpen(false)
          resetState()
        }, 2000)
      } else {
        throw new Error('Failed to create client')
      }
    } catch (error) {
      updateProcessing({
        step: 'complete',
        progress: 100,
        message: '',
        errors: [error instanceof Error ? error.message : 'Failed to create client']
      })
    }
  }

  // Email Processing
  const processPropertyEmail = async () => {
    if (!emailContent.trim()) {
      toast.error('Please enter email content')
      return
    }

    updateProcessing({
      step: 'processing',
      progress: 20,
      message: 'Analyzing email content...',
      errors: [],
      warnings: []
    })

    try {
      const response = await fetch('/api/smart-import/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailContent,
          emailMetadata
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process email')
      }

      const result = await response.json()

      updateProcessing({
        step: 'analyzing',
        progress: 70,
        message: 'Extracting property details...'
      })

      if (result.success) {
        setExtractedPropertyData(result.data)
        updateProcessing({
          step: 'complete',
          progress: 100,
          message: 'Property details extracted successfully',
          warnings: result.warnings || []
        })
      } else {
        updateProcessing({
          step: 'idle',
          progress: 0,
          message: '',
          errors: result.errors || ['Email processing failed']
        })
      }
    } catch (error) {
      updateProcessing({
        step: 'idle',
        progress: 0,
        message: '',
        errors: [error instanceof Error ? error.message : 'Email processing failed']
      })
    }
  }

  const createDealFromEmail = async () => {
    if (!extractedPropertyData) return

    updateProcessing({
      step: 'creating',
      progress: 90,
      message: 'Creating deal record...'
    })

    try {
      // First, try to find or create client
      let clientId = ''
      if (extractedPropertyData.agentInfo?.email) {
        // Create client from agent info
        const clientResponse = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: extractedPropertyData.agentInfo.name || 'Property Contact',
            email: extractedPropertyData.agentInfo.email,
            phone: extractedPropertyData.agentInfo.phone,
            company: extractedPropertyData.agentInfo.company,
            status: 'Seller'
          })
        })

        if (clientResponse.ok) {
          const client = await clientResponse.json()
          clientId = client.id
        }
      }

      // Create deal
      const dealResponse = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Property Deal - ${extractedPropertyData.address}`,
          client_id: clientId,
          value: extractedPropertyData.price || 0,
          status: 'Lead',
          property_address: extractedPropertyData.address,
          property_type: extractedPropertyData.propertyType,
          property_bedrooms: extractedPropertyData.bedrooms,
          property_bathrooms: extractedPropertyData.bathrooms,
          property_sqft: extractedPropertyData.sqft
        })
      })

      if (dealResponse.ok) {
        const deal = await dealResponse.json()
        onDealCreated?.(deal)
        toast.success('Deal created successfully from email')
        updateProcessing({
          step: 'complete',
          progress: 100,
          message: 'Deal created successfully'
        })
        setTimeout(() => {
          setIsOpen(false)
          resetState()
        }, 2000)
      } else {
        throw new Error('Failed to create deal')
      }
    } catch (error) {
      updateProcessing({
        step: 'complete',
        progress: 100,
        message: '',
        errors: [error instanceof Error ? error.message : 'Failed to create deal']
      })
    }
  }

  // Calendar Processing
  const connectCalendar = async () => {
    updateProcessing({
      step: 'uploading',
      progress: 20,
      message: `Connecting to ${calendarProvider} calendar...`,
      errors: [],
      warnings: []
    })

    try {
      // In a real implementation, this would initiate OAuth flow
      // For now, we'll simulate calendar connection
      await new Promise(resolve => setTimeout(resolve, 1500))

      const mockEvents: CalendarEvent[] = [
        {
          id: '1',
          title: 'Property Showing - 123 Main St',
          description: 'Show property to potential buyers',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
          location: '123 Main St, Anytown, ST 12345',
          attendees: ['client@example.com'],
          eventType: 'showing'
        },
        {
          id: '2',
          title: 'Home Inspection - 456 Oak Ave',
          description: 'Attend home inspection with buyers',
          startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
          endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
          location: '456 Oak Ave, Anytown, ST 12345',
          attendees: ['inspector@example.com', 'buyer@example.com'],
          eventType: 'inspection'
        }
      ]

      setCalendarEvents(mockEvents)
      setSelectedEvents(mockEvents.map(e => e.id))

      updateProcessing({
        step: 'complete',
        progress: 100,
        message: `Found ${mockEvents.length} real estate events`
      })
    } catch (error) {
      updateProcessing({
        step: 'idle',
        progress: 0,
        message: '',
        errors: [error instanceof Error ? error.message : 'Calendar connection failed']
      })
    }
  }

  const createTasksFromCalendar = async () => {
    if (selectedEvents.length === 0) return

    updateProcessing({
      step: 'creating',
      progress: 90,
      message: `Creating ${selectedEvents.length} tasks...`
    })

    try {
      const eventsToProcess = calendarEvents.filter(event => selectedEvents.includes(event.id))
      const createdTasks = []

      for (const event of eventsToProcess) {
        const taskResponse = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: event.title,
            description: `${event.description}\n\nLocation: ${event.location}\nScheduled: ${event.startTime.toLocaleString()}`,
            due_date: event.startTime.toISOString(),
            priority: 'Medium',
            type: 'Meeting',
            status: 'Pending'
          })
        })

        if (taskResponse.ok) {
          const task = await taskResponse.json()
          createdTasks.push(task)
        }
      }

      onTasksCreated?.(createdTasks)
      toast.success(`Created ${createdTasks.length} tasks from calendar events`)
      
      updateProcessing({
        step: 'complete',
        progress: 100,
        message: `Created ${createdTasks.length} tasks successfully`
      })

      setTimeout(() => {
        setIsOpen(false)
        resetState()
      }, 2000)
    } catch (error) {
      updateProcessing({
        step: 'complete',
        progress: 100,
        message: '',
        errors: [error instanceof Error ? error.message : 'Failed to create tasks']
      })
    }
  }

  const renderProcessingStatus = () => {
    if (processing.step === 'idle') return null

    return (
      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {processing.step === 'complete' && processing.errors.length === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : processing.errors.length > 0 ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              )}
              <span className="text-sm font-medium">{processing.message}</span>
            </div>
            
            {processing.step !== 'idle' && (
              <Progress value={processing.progress} className="w-full" />
            )}

            {processing.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {processing.errors.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            {processing.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {processing.warnings.join(', ')}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetState()
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Smart Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Import className="h-5 w-5" />
            Smart Import
          </DialogTitle>
          <DialogDescription>
            Automatically extract and import data from business cards, emails, and calendar events
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ImportType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="business-card" className="gap-2">
              <Camera className="h-4 w-4" />
              Business Card
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email Listing
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Calendar Sync
            </TabsTrigger>
          </TabsList>

          {/* Business Card Tab */}
          <TabsContent value="business-card" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Scan Business Card</CardTitle>
                <CardDescription>
                  Upload a business card image to automatically extract contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="business-card-upload">Business Card Image</Label>
                    <Input
                      id="business-card-upload"
                      ref={businessCardInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBusinessCardUpload}
                      className="mt-1"
                    />
                  </div>

                  {businessCardPreview && (
                    <div className="space-y-2">
                      <Label>Preview</Label>
                      <img 
                        src={businessCardPreview} 
                        alt="Business card preview" 
                        className="max-w-sm max-h-48 object-contain border rounded"
                      />
                    </div>
                  )}

                  {businessCardFile && !extractedContactData && processing.step === 'idle' && (
                    <Button onClick={processBusinessCard} className="w-full">
                      <Scan className="h-4 w-4 mr-2" />
                      Scan Business Card
                    </Button>
                  )}

                  {extractedContactData && (
                    <div className="space-y-4">
                      <Label>Extracted Information</Label>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            {extractedContactData.name && (
                              <div>
                                <Label className="text-xs">Name</Label>
                                <p className="font-medium">{extractedContactData.name}</p>
                              </div>
                            )}
                            {extractedContactData.title && (
                              <div>
                                <Label className="text-xs">Title</Label>
                                <p>{extractedContactData.title}</p>
                              </div>
                            )}
                            {extractedContactData.company && (
                              <div>
                                <Label className="text-xs">Company</Label>
                                <p>{extractedContactData.company}</p>
                              </div>
                            )}
                            {extractedContactData.email && (
                              <div>
                                <Label className="text-xs">Email</Label>
                                <p>{extractedContactData.email}</p>
                              </div>
                            )}
                            {extractedContactData.phone && (
                              <div>
                                <Label className="text-xs">Phone</Label>
                                <p>{extractedContactData.phone}</p>
                              </div>
                            )}
                            {extractedContactData.address && (
                              <div className="col-span-2">
                                <Label className="text-xs">Address</Label>
                                <p>{extractedContactData.address}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      
                      {processing.step !== 'creating' && (
                        <Button onClick={createClientFromBusinessCard} className="w-full">
                          <Users className="h-4 w-4 mr-2" />
                          Create Client
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            {renderProcessingStatus()}
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Parse Property Email</CardTitle>
                <CardDescription>
                  Extract property details from real estate listing emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="email-subject">Email Subject</Label>
                    <Input
                      id="email-subject"
                      value={emailMetadata.subject}
                      onChange={(e) => setEmailMetadata(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="New Listing: 123 Main St"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email-sender">Sender Email</Label>
                    <Input
                      id="email-sender"
                      value={emailMetadata.sender}
                      onChange={(e) => setEmailMetadata(prev => ({ ...prev, sender: e.target.value }))}
                      placeholder="agent@realty.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email-timestamp">Date</Label>
                    <Input
                      id="email-timestamp"
                      type="date"
                      value={emailMetadata.timestamp.split('T')[0]}
                      onChange={(e) => setEmailMetadata(prev => ({ 
                        ...prev, 
                        timestamp: new Date(e.target.value).toISOString() 
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email-content">Email Content</Label>
                  <Textarea
                    id="email-content"
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="Paste the email content containing property listing details..."
                    rows={8}
                    className="mt-1"
                  />
                </div>

                {emailContent && !extractedPropertyData && processing.step === 'idle' && (
                  <Button onClick={processPropertyEmail} className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Parse Property Details
                  </Button>
                )}

                {extractedPropertyData && (
                  <div className="space-y-4">
                    <Label>Extracted Property Details</Label>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label className="text-xs">Address</Label>
                            <p className="font-medium">{extractedPropertyData.address}</p>
                          </div>
                          {extractedPropertyData.price && (
                            <div>
                              <Label className="text-xs">Price</Label>
                              <p>${extractedPropertyData.price.toLocaleString()}</p>
                            </div>
                          )}
                          {extractedPropertyData.propertyType && (
                            <div>
                              <Label className="text-xs">Type</Label>
                              <p>{extractedPropertyData.propertyType}</p>
                            </div>
                          )}
                          {extractedPropertyData.bedrooms && (
                            <div>
                              <Label className="text-xs">Bedrooms</Label>
                              <p>{extractedPropertyData.bedrooms}</p>
                            </div>
                          )}
                          {extractedPropertyData.bathrooms && (
                            <div>
                              <Label className="text-xs">Bathrooms</Label>
                              <p>{extractedPropertyData.bathrooms}</p>
                            </div>
                          )}
                          {extractedPropertyData.sqft && (
                            <div>
                              <Label className="text-xs">Square Feet</Label>
                              <p>{extractedPropertyData.sqft.toLocaleString()}</p>
                            </div>
                          )}
                          {extractedPropertyData.mlsNumber && (
                            <div>
                              <Label className="text-xs">MLS #</Label>
                              <p>{extractedPropertyData.mlsNumber}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {processing.step !== 'creating' && (
                      <Button onClick={createDealFromEmail} className="w-full">
                        <Building className="h-4 w-4 mr-2" />
                        Create Deal
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            {renderProcessingStatus()}
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sync Calendar Events</CardTitle>
                <CardDescription>
                  Import calendar events and automatically create tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="calendar-provider">Calendar Provider</Label>
                  <Select value={calendarProvider} onValueChange={(value) => setCalendarProvider(value as 'google' | 'outlook')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Calendar</SelectItem>
                      <SelectItem value="outlook">Outlook Calendar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {calendarEvents.length === 0 && processing.step === 'idle' && (
                  <Button onClick={connectCalendar} className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    Connect {calendarProvider === 'google' ? 'Google' : 'Outlook'} Calendar
                  </Button>
                )}

                {calendarEvents.length > 0 && (
                  <div className="space-y-4">
                    <Label>Real Estate Events Found</Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {calendarEvents.map((event) => (
                        <Card key={event.id} className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedEvents.includes(event.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedEvents(prev => [...prev, event.id])
                                    } else {
                                      setSelectedEvents(prev => prev.filter(id => id !== event.id))
                                    }
                                  }}
                                />
                                <h4 className="font-medium">{event.title}</h4>
                                <Badge variant="outline">{event.eventType}</Badge>
                              </div>
                              <p className="text-sm text-gray-600">{event.description}</p>
                              <p className="text-xs text-gray-500">
                                {event.startTime.toLocaleString()} • {event.location}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {selectedEvents.length > 0 && processing.step !== 'creating' && (
                      <Button onClick={createTasksFromCalendar} className="w-full">
                        <Clock className="h-4 w-4 mr-2" />
                        Create {selectedEvents.length} Tasks
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            {renderProcessingStatus()}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}