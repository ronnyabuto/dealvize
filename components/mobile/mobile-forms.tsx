'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Save,
  X,
  Plus,
  Minus,
  Upload,
  Camera,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Mail,
  Phone,
  Building,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'switch' | 'date' | 'currency'
  label: string
  placeholder?: string
  required?: boolean
  options?: Array<{ value: string; label: string }>
  value?: any
  error?: string
}

interface MobileFormProps {
  title: string
  description?: string
  fields: FormField[]
  onSubmit: (data: Record<string, any>) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
  isSubmitting?: boolean
  showProgress?: boolean
}

interface QuickAddClientProps {
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
}

interface QuickAddDealProps {
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  clients: Array<{ id: string; name: string }>
}

export function MobileForm({ 
  title, 
  description, 
  fields, 
  onSubmit, 
  onCancel,
  submitLabel = 'Save',
  isSubmitting = false,
  showProgress = false
}: MobileFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentStep, setCurrentStep] = useState(0)

  const stepsPerPage = 5
  const totalSteps = Math.ceil(fields.length / stepsPerPage)
  const currentFields = fields.slice(currentStep * stepsPerPage, (currentStep + 1) * stepsPerPage)

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }))
    }
  }

  const validateCurrentStep = () => {
    const stepErrors: Record<string, string> = {}
    
    currentFields.forEach(field => {
      if (field.required && (!formData[field.id] || formData[field.id] === '')) {
        stepErrors[field.id] = `${field.label} is required`
      }
      
      if (field.type === 'email' && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData[field.id])) {
          stepErrors[field.id] = 'Please enter a valid email address'
        }
      }
      
      if (field.type === 'phone' && formData[field.id]) {
        const phoneRegex = /^\+?[\d\s-()]+$/
        if (!phoneRegex.test(formData[field.id])) {
          stepErrors[field.id] = 'Please enter a valid phone number'
        }
      }
    })
    
    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        handleSubmit()
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (validateCurrentStep()) {
      try {
        await onSubmit(formData)
      } catch (error) {
        console.error('Form submission error:', error)
      }
    }
  }

  const renderField = (field: FormField) => {
    const hasError = !!errors[field.id]
    
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={cn(hasError && 'border-red-500')}
            rows={3}
          />
        )
      
      case 'select':
        return (
          <Select
            value={formData[field.id] || ''}
            onValueChange={(value) => handleFieldChange(field.id, value)}
          >
            <SelectTrigger className={cn(hasError && 'border-red-500')}>
              <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case 'switch':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={field.id}
              checked={formData[field.id] || false}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
            />
            <Label htmlFor={field.id} className="text-sm">
              {field.placeholder || 'Enable'}
            </Label>
          </div>
        )
      
      case 'currency':
        return (
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id={field.id}
              type="number"
              placeholder={field.placeholder}
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value) || 0)}
              className={cn('pl-10', hasError && 'border-red-500')}
              min="0"
              step="0.01"
            />
          </div>
        )
      
      default:
        return (
          <Input
            id={field.id}
            type={field.type}
            placeholder={field.placeholder}
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={cn(hasError && 'border-red-500')}
          />
        )
    }
  }

  return (
    <div className="lg:hidden fixed inset-0 bg-white z-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              {description && (
                <p className="text-sm text-gray-500">{description}</p>
              )}
            </div>
          </div>
          
          {showProgress && totalSteps > 1 && (
            <div className="text-sm text-gray-500">
              {currentStep + 1} of {totalSteps}
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        {showProgress && totalSteps > 1 && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Form Content */}
      <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
        <div className="p-4 space-y-4">
          {currentFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id} className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {renderField(field)}
              {errors[field.id] && (
                <div className="flex items-center space-x-1 text-red-600 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors[field.id]}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePrevious} className="flex-1">
              Previous
            </Button>
          )}
          
          <Button 
            onClick={handleNext} 
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {currentStep < totalSteps - 1 ? 'Next' : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function QuickAddClient({ onSubmit, onCancel }: QuickAddClientProps) {
  const fields: FormField[] = [
    {
      id: 'firstName',
      type: 'text',
      label: 'First Name',
      placeholder: 'Enter first name',
      required: true
    },
    {
      id: 'lastName',
      type: 'text',
      label: 'Last Name',
      placeholder: 'Enter last name',
      required: true
    },
    {
      id: 'email',
      type: 'email',
      label: 'Email',
      placeholder: 'Enter email address',
      required: true
    },
    {
      id: 'phone',
      type: 'phone',
      label: 'Phone',
      placeholder: 'Enter phone number'
    },
    {
      id: 'source',
      type: 'select',
      label: 'Lead Source',
      options: [
        { value: 'website', label: 'Website' },
        { value: 'referral', label: 'Referral' },
        { value: 'social', label: 'Social Media' },
        { value: 'advertising', label: 'Advertising' },
        { value: 'cold_outreach', label: 'Cold Outreach' },
        { value: 'event', label: 'Event' }
      ]
    },
    {
      id: 'budgetMin',
      type: 'currency',
      label: 'Minimum Budget',
      placeholder: '0'
    },
    {
      id: 'budgetMax',
      type: 'currency',
      label: 'Maximum Budget',
      placeholder: '0'
    },
    {
      id: 'preferredLocation',
      type: 'text',
      label: 'Preferred Location',
      placeholder: 'Enter preferred location'
    },
    {
      id: 'notes',
      type: 'textarea',
      label: 'Notes',
      placeholder: 'Add any additional notes...'
    }
  ]

  return (
    <MobileForm
      title="Add New Client"
      description="Quickly capture client information"
      fields={fields}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel="Add Client"
      showProgress={true}
    />
  )
}

export function QuickAddDeal({ onSubmit, onCancel, clients }: QuickAddDealProps) {
  const fields: FormField[] = [
    {
      id: 'title',
      type: 'text',
      label: 'Deal Title',
      placeholder: 'Enter deal title',
      required: true
    },
    {
      id: 'clientId',
      type: 'select',
      label: 'Client',
      required: true,
      options: clients.map(client => ({ value: client.id, label: client.name }))
    },
    {
      id: 'value',
      type: 'currency',
      label: 'Deal Value',
      placeholder: '0',
      required: true
    },
    {
      id: 'probability',
      type: 'number',
      label: 'Probability (%)',
      placeholder: '50'
    },
    {
      id: 'expectedCloseDate',
      type: 'date',
      label: 'Expected Close Date'
    },
    {
      id: 'stage',
      type: 'select',
      label: 'Deal Stage',
      options: [
        { value: 'initial_contact', label: 'Initial Contact' },
        { value: 'qualification', label: 'Qualification' },
        { value: 'proposal', label: 'Proposal' },
        { value: 'negotiation', label: 'Negotiation' }
      ]
    },
    {
      id: 'priority',
      type: 'select',
      label: 'Priority',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' }
      ]
    },
    {
      id: 'description',
      type: 'textarea',
      label: 'Description',
      placeholder: 'Describe the deal...'
    }
  ]

  return (
    <MobileForm
      title="Add New Deal"
      description="Create a new deal opportunity"
      fields={fields}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel="Create Deal"
      showProgress={true}
    />
  )
}