'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Loader2, Save, X } from 'lucide-react'
import { useClients, type Client } from '@/hooks/use-clients'
import { useDeals } from '@/hooks/use-deals'
import { z } from 'zod'

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone is required').max(20, 'Phone too long'),
  address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
  company: z.string().max(100, 'Company name too long').optional().or(z.literal('')),
  status: z.enum(['Buyer', 'Seller', 'In Contract']).default('Buyer'),
  // Deal fields (optional)
  createDeal: z.boolean().default(false),
  dealTitle: z.string().optional(),
  dealValue: z.string().optional(),
  dealCommission: z.string().optional(),
  dealStatus: z.enum(['Lead', 'In Progress', 'Under Contract', 'Closed', 'Lost']).default('Lead'),
  expectedCloseDate: z.string().optional(),
  propertyAddress: z.string().optional(),
  propertyType: z.string().optional(),
  propertyBedrooms: z.string().optional(),
  propertyBathrooms: z.string().optional(),
  propertySqft: z.string().optional()
})

type ClientFormData = z.infer<typeof clientSchema>

interface ClientFormProps {
  client?: Client
  mode: 'create' | 'edit'
}

export function ClientForm({ client, mode }: ClientFormProps) {
  const router = useRouter()
  const { createClient, updateClient } = useClients()
  const { createDeal } = useDeals()

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name ?? '',
      email: client?.email ?? '',
      phone: client?.phone ?? '',
      address: client?.address ?? '',
      company: client?.company ?? '',
      status: client?.status ?? 'Buyer',
      // Deal fields
      createDeal: false,
      dealTitle: '',
      dealValue: '',
      dealCommission: '',
      dealStatus: 'Lead',
      expectedCloseDate: '',
      propertyAddress: '',
      propertyType: '',
      propertyBedrooms: '',
      propertyBathrooms: '',
      propertySqft: ''
    }
  })

  const statusOptions = [
    { value: 'Buyer', label: 'Buyer' },
    { value: 'Seller', label: 'Seller' },
    { value: 'In Contract', label: 'In Contract' }
  ] as const

  const dealStatusOptions = [
    { value: 'Lead', label: 'Lead' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Under Contract', label: 'Under Contract' },
    { value: 'Closed', label: 'Closed' },
    { value: 'Lost', label: 'Lost' }
  ] as const

  const propertyTypeOptions = [
    { value: 'Single Family', label: 'Single Family Home' },
    { value: 'Condo', label: 'Condominium' },
    { value: 'Townhouse', label: 'Townhouse' },
    { value: 'Multi-Family', label: 'Multi-Family' },
    { value: 'Land', label: 'Land' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Other', label: 'Other' }
  ] as const

  const onSubmit = async (data: ClientFormData) => {
    try {
      const clientData = {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        address: data.address.trim(),
        company: data.company?.trim() || '',
        status: data.status
      }

      let clientResult
      if (mode === 'create') {
        clientResult = await createClient(clientData)
      } else if (client) {
        clientResult = await updateClient(client.id, clientData)
      }

      if (!clientResult) {
        throw new Error('Failed to save client. Please try again.')
      }

      // If user wants to create a deal, create it after successful client creation
      if (mode === 'create' && data.createDeal && data.dealTitle?.trim()) {
        const dealData = {
          clientId: clientResult.id,
          title: data.dealTitle.trim(),
          value: data.dealValue || '$0',
          commission: data.dealCommission || '$0',
          status: data.dealStatus,
          probability: 0,
          expectedCloseDate: data.expectedCloseDate || undefined,
          property: {
            address: data.propertyAddress?.trim() || '',
            type: data.propertyType || '',
            bedrooms: data.propertyBedrooms ? parseInt(data.propertyBedrooms) : undefined,
            bathrooms: data.propertyBathrooms ? parseInt(data.propertyBathrooms) : undefined,
            sqft: data.propertySqft ? parseInt(data.propertySqft) : undefined
          }
        }

        const dealResult = await createDeal(dealData)
        if (!dealResult) {
          // Client was created but deal failed - warn the user
          form.setError('root', {
            type: 'manual',
            message: 'Client was created successfully, but there was an error creating the deal. You can create the deal manually from the deals page.'
          })
          // Still navigate to clients page after a delay
          setTimeout(() => router.push('/clients'), 3000)
          return
        }
      }

      router.push('/clients')
    } catch (err: any) {
      form.setError('root', {
        type: 'manual',
        message: err.message || 'An unexpected error occurred'
      })
    }
  }

  const handleCancel = () => {
    router.push('/clients')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === 'create' ? 'Add New Client' : 'Edit Client'}
          </CardTitle>
          <CardDescription>
            {mode === 'create' 
              ? 'Enter the client information below to add them to your CRM.'
              : 'Update the client information below.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {form.formState.errors.root && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter full address" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Client Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Client Status</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select client type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Deal Creation (only show for new clients) */}
              {mode === 'create' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name="createDeal"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-lg font-medium">
                              Create Initial Deal
                            </FormLabel>
                            <FormDescription>
                              Automatically create a deal for this client
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.watch('createDeal') && (
                    <div className="space-y-4 border-l-4 border-blue-500 pl-4">
                      <h4 className="text-base font-medium text-blue-700">Deal Details</h4>
                      
                      {/* Basic Deal Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="dealTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Deal Title *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter deal title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="dealStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Deal Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select deal status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {dealStatusOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Financial Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="dealValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Deal Value</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                  <Input placeholder="0" className="pl-8" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="dealCommission"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Commission</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                  <Input placeholder="0" className="pl-8" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="expectedCloseDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expected Close Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Property Information */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-medium text-gray-700">Property Information (Optional)</h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="propertyAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Property Address</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Enter property address" rows={2} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="propertyType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Property Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select property type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {propertyTypeOptions.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="propertyBedrooms"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bedrooms</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="propertyBathrooms"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bathrooms</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" step="0.5" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="propertySqft"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Square Feet</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={form.formState.isSubmitting}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={form.formState.isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {mode === 'create' ? 'Add Client' : 'Update Client'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}