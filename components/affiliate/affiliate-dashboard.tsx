'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Share2, 
  DollarSign, 
  Users, 
  TrendingUp,
  Copy,
  ExternalLink,
  Award
} from 'lucide-react'
import { 
  getAffiliateDashboard, 
  createAffiliateProgram, 
  getAffiliateLink,
  COMMISSION_TIERS,
  createPayoutRequest
} from '@/lib/affiliate/affiliate-system'
import { getTierIcon, getTierColor } from '@/lib/utils/ui-helpers'

interface AffiliateDashboardProps {
  userId: string
  userName: string
  userEmail: string
}

export function AffiliateDashboard({ userId, userName, userEmail }: AffiliateDashboardProps) {
  const [affiliateData, setAffiliateData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('paypal')

  useEffect(() => {
    loadAffiliateData()
  }, [userId])

  const loadAffiliateData = async () => {
    try {
      setLoading(true)
      const data = await getAffiliateDashboard(userId)
      setAffiliateData(data)
    } catch (error) {
      console.error('Failed to load affiliate data:', error)
      setAffiliateData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinProgram = async () => {
    try {
      setLoading(true)
      await createAffiliateProgram(userId, userName)
      await loadAffiliateData()
    } catch (error) {
      console.error('Failed to join affiliate program:', error)
      setLoading(false)
      alert('Failed to join affiliate program. Please try again or contact support if the issue persists.')
    }
  }

  const copyAffiliateLink = async () => {
    if (!affiliateData) return
    
    try {
      const link = getAffiliateLink(affiliateData.referral_code)
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
      alert('Failed to copy link. Please try again.')
    }
  }

  const handlePayoutRequest = async () => {
    if (!payoutAmount || !affiliateData) return
    
    try {
      await createPayoutRequest(affiliateData.id, parseFloat(payoutAmount), paymentMethod)
      setPayoutAmount('')
      // Refresh data
      await loadAffiliateData()
    } catch (error) {
      console.error('Failed to create payout request:', error)
    }
  }


  const getNextTier = (currentTier: string) => {
    switch (currentTier) {
      case 'bronze': return { name: 'silver', needed: COMMISSION_TIERS.silver.minReferrals }
      case 'silver': return { name: 'gold', needed: COMMISSION_TIERS.gold.minReferrals }
      case 'gold': return { name: 'platinum', needed: COMMISSION_TIERS.platinum.minReferrals }
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dealvize-teal"></div>
            <p className="text-sm text-gray-600">Loading your affiliate data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Not an affiliate yet - show join program
  if (!affiliateData) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
              <Share2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl">Join Our Partner Program</CardTitle>
            <p className="text-gray-600 mt-2">
              Earn up to 30% commission for every customer you refer to Dealvize
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-blue-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="font-semibold">High Commissions</p>
                <p className="text-gray-600">10-30% recurring</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="font-semibold">Tier Upgrades</p>
                <p className="text-gray-600">Higher rates with performance</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="font-semibold">Real Estate Focus</p>
                <p className="text-gray-600">Perfect for your network</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-left">Commission Tiers:</h4>
              <div className="space-y-2">
                {Object.entries(COMMISSION_TIERS).map(([key, tier]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium capitalize">{tier.name}</span>
                    <span className="text-sm text-gray-600">{tier.minReferrals}+ referrals</span>
                    <Badge variant="outline">{(tier.rate * 100)}%</Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <Button onClick={handleJoinProgram} className="w-full bg-dealvize-teal hover:bg-dealvize-teal/90">
              Join Partner Program
            </Button>
            
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Getting Started</h4>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Click "Join Partner Program" to get started</li>
                <li>Get your unique referral link</li>
                <li>Share with your network and start earning commissions</li>
                <li>Track your earnings and get paid monthly</li>
              </ol>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-800">
                  <strong>Dev Note:</strong> If the "Join" button shows errors, run the affiliate migration SQL in Supabase.
                  <br />File: <code>supabase/migrations/safe_affiliate_migration.sql</code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Existing affiliate - show dashboard
  const nextTier = getNextTier(affiliateData.tier)
  const TierIcon = getTierIcon(affiliateData.tier)
  const affiliateLink = getAffiliateLink(affiliateData.referral_code)

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Affiliate Dashboard</h1>
          <p className="text-gray-600">Track your referrals and earnings</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getTierColor(affiliateData.tier)}>
            <TierIcon className="h-3 w-3 mr-1" />
            {COMMISSION_TIERS[affiliateData.tier as keyof typeof COMMISSION_TIERS].name}
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">Total Referrals</span>
            </div>
            <p className="text-2xl font-bold">{affiliateData.total_referrals}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">Conversion Rate</span>
            </div>
            <p className="text-2xl font-bold">{affiliateData.conversionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-gray-600">Pending Earnings</span>
            </div>
            <p className="text-2xl font-bold">${affiliateData.pendingEarnings.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-gray-600">Commission Rate</span>
            </div>
            <p className="text-2xl font-bold">{(affiliateData.commission_rate * 100)}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="tools">Marketing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Tier Progress */}
          {nextTier && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tier Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress to {nextTier.name} tier</span>
                    <span>{affiliateData.total_referrals} / {nextTier.needed}</span>
                  </div>
                  <Progress 
                    value={(affiliateData.total_referrals / nextTier.needed) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-gray-500">
                    {nextTier.needed - affiliateData.total_referrals} more referrals to unlock {COMMISSION_TIERS[nextTier.name as keyof typeof COMMISSION_TIERS].rate * 100}% commission
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Affiliate Link */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Referral Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input value={affiliateLink} readOnly className="font-mono text-sm" />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyAffiliateLink}
                >
                  {copied ? 'Copied!' : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Share this link to earn {(affiliateData.commission_rate * 100)}% commission on every signup
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              {affiliateData.referrals && affiliateData.referrals.length > 0 ? (
                <div className="space-y-3">
                  {affiliateData.referrals.slice(0, 10).map((referral: any, index: number) => (
                    <div key={referral.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Referral #{index + 1}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={
                          referral.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                          referral.status === 'paid' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }>
                          {referral.status}
                        </Badge>
                        {referral.commission_amount > 0 && (
                          <p className="text-sm font-medium text-green-600 mt-1">
                            ${referral.commission_amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No referrals yet. Start sharing your link!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request Payout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Enter amount"
                    max={affiliateData.pendingEarnings}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="paypal">PayPal</option>
                    <option value="stripe">Stripe</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>
              <Button 
                onClick={handlePayoutRequest}
                disabled={!payoutAmount || parseFloat(payoutAmount) > affiliateData.pendingEarnings}
                className="w-full"
              >
                Request Payout
              </Button>
              <p className="text-xs text-gray-500">
                Minimum payout: $50. Available: ${affiliateData.pendingEarnings.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Marketing Materials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Download Banners
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Email Templates
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Social Media Kit
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    <option value="paypal">PayPal</option>
                    <option value="stripe">Stripe</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}