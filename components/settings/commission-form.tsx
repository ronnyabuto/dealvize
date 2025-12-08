'use client'

/**
 * Commission Settings Form Component
 * Allows users to configure commission rates and broker splits
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calculator, Save, RefreshCw } from 'lucide-react'
import { CommissionSettingsSchema, COMMISSION_STRUCTURE_OPTIONS, SUPPORTED_CURRENCIES, type CommissionSettings } from '@/lib/validations/commission'
import { useRBAC } from '@/lib/rbac/context'
import { toast } from 'sonner'

interface CommissionFormProps {
  userId?: string // For admin use
  onSuccess?: () => void
}

export function CommissionForm({ userId, onSuccess }: CommissionFormProps) {
  const { currentTenant, hasPermission } = useRBAC()
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [calculationResult, setCalculationResult] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)

  const form = useForm<CommissionSettings>({
    resolver: zodResolver(CommissionSettingsSchema),
    defaultValues: {
      defaultCommissionRate: 3.00,
      brokerSplitPercentage: 50.00,
      commissionStructure: 'flat',
      customRates: {},
      currency: 'USD',
      notes: ''
    }
  })

  // Load existing commission settings
  useEffect(() => {
    loadCommissionSettings()
  }, [userId])

  const loadCommissionSettings = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)

      const response = await fetch(`/api/user/commission-settings?${params}`)
      
      if (response.ok) {
        const { settings } = await response.json()
        if (settings && settings.id) {
          form.reset({
            defaultCommissionRate: settings.defaultCommissionRate,
            brokerSplitPercentage: settings.brokerSplitPercentage,
            commissionStructure: settings.commissionStructure,
            customRates: settings.customRates || {},
            currency: settings.currency,
            effectiveDate: settings.effectiveDate,
            notes: settings.notes || ''
          })
          setIsEditing(true)
        }
      }
    } catch (error) {
      console.error('Error loading commission settings:', error)
      toast.error('Failed to load commission settings')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: CommissionSettings) => {
    try {
      setLoading(true)
      
      const payload = userId ? { ...data, userId } : data
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch('/api/user/commission-settings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message || 'Commission settings saved successfully')
        setIsEditing(true)
        onSuccess?.()
      } else {
        const error = await response.json()
        if (error.details) {
          error.details.forEach((detail: any) => {
            form.setError(detail.field as any, { message: detail.message })
          })
        } else {
          toast.error(error.error || 'Failed to save commission settings')
        }
      }
    } catch (error) {
      console.error('Error saving commission settings:', error)
      toast.error('Failed to save commission settings')
    } finally {
      setLoading(false)
    }
  }

  const calculateCommission = async () => {
    const dealValue = 500000 // Example deal value for calculation
    const commissionRate = form.getValues('defaultCommissionRate')
    const commissionAmount = (dealValue * commissionRate) / 100

    try {
      setCalculating(true)
      
      const response = await fetch('/api/user/commission-settings/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commissionAmount,
          dealValue,
          userId
        })
      })

      if (response.ok) {
        const result = await response.json()
        setCalculationResult(result)
      } else {
        toast.error('Failed to calculate commission')
      }
    } catch (error) {
      console.error('Error calculating commission:', error)
      toast.error('Failed to calculate commission')
    } finally {
      setCalculating(false)
    }
  }

  const resetForm = () => {
    form.reset({
      defaultCommissionRate: 3.00,
      brokerSplitPercentage: 50.00,
      commissionStructure: 'flat',
      customRates: {},
      currency: 'USD',
      notes: ''
    })
    setCalculationResult(null)
    setIsEditing(false)
  }

  // Check permissions for editing other users' settings
  const canEdit = !userId || hasPermission('MEMBERS_MANAGE')

  if (!canEdit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commission Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              You don't have permission to manage commission settings for other users.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Commission Settings
          {isEditing && <Badge variant="secondary">Active</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Basic Commission Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="defaultCommissionRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Commission Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="3.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Your standard commission rate percentage
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brokerSplitPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Broker Split (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="50.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Percentage that goes to the broker
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Commission Structure */}
            <FormField
              control={form.control}
              name="commissionStructure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commission Structure</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select commission structure" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COMMISSION_STRUCTURE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-gray-500">{option.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Currency */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.name} ({currency.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Effective Date */}
              <FormField
                control={form.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      When these settings take effect
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about commission structure..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional notes about your commission settings
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Commission Calculator */}
            {isEditing && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Commission Calculator</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={calculateCommission}
                      disabled={calculating}
                    >
                      {calculating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <Calculator className="h-4 w-4 mr-2" />
                          Calculate Sample Commission
                        </>
                      )}
                    </Button>
                  </div>

                  {calculationResult && (
                    <Alert>
                      <AlertDescription>
                        <div className="space-y-2">
                          <div className="font-medium">Sample $500,000 Deal:</div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Total Commission:</span>
                              <span className="ml-2 font-medium">${calculationResult.totalCommission.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Your Amount:</span>
                              <span className="ml-2 font-medium text-green-600">${calculationResult.agentAmount.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Broker Amount:</span>
                              <span className="ml-2 font-medium">${calculationResult.brokerAmount.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Split:</span>
                              <span className="ml-2 font-medium">{calculationResult.calculation.agentPercentage}% / {calculationResult.calculation.brokerPercentage}%</span>
                            </div>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={resetForm}
                disabled={loading}
              >
                Reset to Defaults
              </Button>
              
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? 'Update Settings' : 'Save Settings'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}