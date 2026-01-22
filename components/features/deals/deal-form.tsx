'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, X } from 'lucide-react'
import { useDeals } from '@/hooks/use-deals'
import { useClients } from '@/hooks/use-clients'
import { type Deal } from '@/lib/types'
import { calculateCommission, formatCurrency as formatCommissionCurrency } from '@/lib/commission'

interface DealFormProps {
  deal?: Deal
  mode: 'create' | 'edit'
}

export function DealForm({ deal, mode }: DealFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { createDeal, updateDeal } = useDeals()
  const { clients: clientOptions } = useClients()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: deal?.title || '',
    clientId: deal?.clientId || searchParams.get('client') || '',
    value: deal?.value?.replace(/[$,]/g, '') || '',
    commission: deal?.commission?.replace(/[$,]/g, '') || '',
    commissionPercentage: deal?.commissionPercentage?.toString() || '',
    status: deal?.status || 'Qualified',
    probability: deal?.probability?.toString() || '0',
    expectedCloseDate: deal?.expectedCloseDate && deal.expectedCloseDate !== 'Not set'
      ? new Date(deal.expectedCloseDate).toISOString().split('T')[0]
      : '',
    propertyAddress: deal?.property?.address || '',
    propertyType: deal?.property?.type || '',
    propertyBedrooms: deal?.property?.bedrooms?.toString() || '',
    propertyBathrooms: deal?.property?.bathrooms?.toString() || '',
    propertySqft: deal?.property?.sqft?.toString() || ''
  })

  const statusOptions = [
    { value: 'Qualified', label: 'Qualified' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Under Contract', label: 'Under Contract' },
    { value: 'Closed', label: 'Closed' },
    { value: 'Lost', label: 'Lost' }
  ]

  const propertyTypes = [
    { value: 'Single Family', label: 'Single Family Home' },
    { value: 'Condo', label: 'Condominium' },
    { value: 'Townhouse', label: 'Townhouse' },
    { value: 'Multi-Family', label: 'Multi-Family' },
    { value: 'Land', label: 'Land' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Other', label: 'Other' }
  ]

  useEffect(() => {
    if (formData.value && formData.commissionPercentage) {
      const calculatedCommission = calculateCommission(formData.value, parseFloat(formData.commissionPercentage))
      setFormData(prev => ({
        ...prev,
        commission: calculatedCommission.toString()
      }))
    }
  }, [formData.value, formData.commissionPercentage])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }

      if (field === 'value' || field === 'commissionPercentage') {
        const dealValue = field === 'value' ? value : newData.value
        const percentage = field === 'commissionPercentage' ? value : newData.commissionPercentage

        if (dealValue && percentage) {
          const calculatedCommission = calculateCommission(dealValue, parseFloat(percentage))
          newData.commission = calculatedCommission.toString()
        }
      }

      return newData
    })
    if (error) setError(null)
  }

  const formatCurrency = (value: string): string => {
    const number = parseFloat(value.replace(/[^\d.]/g, ''))
    if (isNaN(number)) return ''
    return number.toLocaleString('en-US')
  }

  const handleCurrencyChange = (field: string, value: string) => {
    const cleanValue = value.replace(/[^\d.]/g, '')
    handleInputChange(field, cleanValue)
  }

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('Deal title is required')
      return false
    }

    if (!formData.clientId) {
      setError('Please select a client')
      return false
    }

    if (formData.value && isNaN(parseFloat(formData.value))) {
      setError('Please enter a valid deal value')
      return false
    }

    if (formData.probability && (isNaN(parseInt(formData.probability)) || parseInt(formData.probability) < 0 || parseInt(formData.probability) > 100)) {
      setError('Probability must be a number between 0 and 100')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      const dealData: Partial<Deal> = {
        title: formData.title.trim(),
        clientId: formData.clientId,
        value: formData.value ? `$${formatCurrency(formData.value)}` : '$0',
        commission: formData.commission ? `$${formatCurrency(formData.commission)}` : '$0',
        commissionPercentage: formData.commissionPercentage ? parseFloat(formData.commissionPercentage) : undefined,
        status: formData.status as Deal['status'],
        probability: parseInt(formData.probability) || 0,
        expectedCloseDate: formData.expectedCloseDate || undefined,
        property: {
          address: formData.propertyAddress.trim(),
          type: formData.propertyType,
          bedrooms: formData.propertyBedrooms ? parseInt(formData.propertyBedrooms) : undefined,
          bathrooms: formData.propertyBathrooms ? parseInt(formData.propertyBathrooms) : undefined,
          sqft: formData.propertySqft ? parseInt(formData.propertySqft) : undefined
        }
      }

      let result
      if (mode === 'create') {
        result = await createDeal(dealData)
      } else if (deal) {
        result = await updateDeal(deal.id, dealData)
      }

      if (result) {
        router.push('/deals')
      } else {
        setError('Failed to save deal. Please try again.')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/deals')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === 'create' ? 'Add New Deal' : 'Edit Deal'}
          </CardTitle>
          <CardDescription>
            {mode === 'create'
              ? 'Enter the deal information below to add it to your pipeline.'
              : 'Update the deal information below.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Deal Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Deal Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter deal title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client">Client *</Label>
                  <Select value={formData.clientId} onValueChange={(value) => handleInputChange('clientId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientOptions.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {`${client.first_name} ${client.last_name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Deal Value</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="value"
                      value={formatCurrency(formData.value)}
                      onChange={(e) => handleCurrencyChange('value', e.target.value)}
                      placeholder="0"
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commissionPercentage">Commission %</Label>
                  <div className="relative">
                    <Input
                      id="commissionPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.commissionPercentage}
                      onChange={(e) => handleInputChange('commissionPercentage', e.target.value)}
                      placeholder="2.5"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commission">Commission ($)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="commission"
                      value={formatCurrency(formData.commission)}
                      placeholder="0"
                      className="pl-8 bg-gray-50 text-gray-700"
                      readOnly
                      title="Auto-calculated from deal value and commission percentage"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Automatically calculated from deal value × commission %</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="probability">Probability (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => handleInputChange('probability', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                  <Input
                    id="expectedCloseDate"
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) => handleInputChange('expectedCloseDate', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Property Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyAddress">Property Address</Label>
                  <Textarea
                    id="propertyAddress"
                    value={formData.propertyAddress}
                    onChange={(e) => handleInputChange('propertyAddress', e.target.value)}
                    placeholder="Enter property address"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Select value={formData.propertyType} onValueChange={(value) => handleInputChange('propertyType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyBedrooms">Bedrooms</Label>
                  <Input
                    id="propertyBedrooms"
                    type="number"
                    min="0"
                    value={formData.propertyBedrooms}
                    onChange={(e) => handleInputChange('propertyBedrooms', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propertyBathrooms">Bathrooms</Label>
                  <Input
                    id="propertyBathrooms"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.propertyBathrooms}
                    onChange={(e) => handleInputChange('propertyBathrooms', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propertySqft">Square Feet</Label>
                  <Input
                    id="propertySqft"
                    type="number"
                    min="0"
                    value={formData.propertySqft}
                    onChange={(e) => handleInputChange('propertySqft', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {mode === 'create' ? 'Create Deal' : 'Update Deal'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}