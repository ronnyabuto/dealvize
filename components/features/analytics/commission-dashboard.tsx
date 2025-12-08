'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, TrendingUp, DollarSign, Calculator } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { calculateCommission, formatCurrency, formatCommissionDisplay, calculateTotalCommissionRevenue, getCommissionForecast } from '@/lib/commission'
import { Deal } from '@/lib/types'

interface CommissionDashboardProps {
  deals: Deal[]
}

export function CommissionDashboard({ deals }: CommissionDashboardProps) {
  const [defaultPercentage, setDefaultPercentage] = useState(2.5)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchCommissionSettings()
  }, [])

  const fetchCommissionSettings = async () => {
    try {
      const response = await fetch('/api/commission-settings')
      if (response.ok) {
        const settings = await response.json()
        setDefaultPercentage(settings.default_percentage)
      }
    } catch (error) {
      console.error('Failed to fetch commission settings:', error)
    }
  }

  const updateCommissionSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/commission-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ default_percentage: defaultPercentage }),
      })

      if (response.ok) {
        toast({
          title: 'Settings Updated',
          description: 'Commission settings have been saved successfully.',
        })
        setIsSettingsOpen(false)
      } else {
        throw new Error('Failed to update settings')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update commission settings.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const commissionRevenue = calculateTotalCommissionRevenue(deals)
  const forecast = getCommissionForecast(deals)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Commission Dashboard</h2>
          <p className="text-muted-foreground">Track your commission earnings and forecasts</p>
        </div>
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Commission Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="defaultPercentage">Default Commission Percentage</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="defaultPercentage"
                    type="number"
                    value={defaultPercentage}
                    onChange={(e) => setDefaultPercentage(parseFloat(e.target.value))}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <Button onClick={updateCommissionSettings} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(commissionRevenue.expected)}</div>
            <p className="text-xs text-muted-foreground">
              Based on deal probability
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(commissionRevenue.closed)}</div>
            <p className="text-xs text-muted-foreground">
              From completed deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(commissionRevenue.pipeline)}</div>
            <p className="text-xs text-muted-foreground">
              Potential commission revenue
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">This Month Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(forecast.thisMonth)}</div>
            <p className="text-xs text-muted-foreground">Expected closings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Next Month Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(forecast.nextMonth)}</div>
            <p className="text-xs text-muted-foreground">Projected revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Quarter Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(forecast.thisQuarter)}</div>
            <p className="text-xs text-muted-foreground">Quarterly projection</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Deals</CardTitle>
          <CardDescription>Commission breakdown for active deals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {deals.slice(0, 5).map((deal) => {
              const value = parseFloat(deal.value.replace(/[$,]/g, ''))
              const commission = calculateCommission(value, deal.commissionPercentage || defaultPercentage)
              
              return (
                <div key={deal.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{deal.title}</h4>
                      <Badge variant="outline">{deal.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Deal Value: {deal.value}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCommissionDisplay(value, deal.commissionPercentage || defaultPercentage)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {deal.probability}% probability
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}