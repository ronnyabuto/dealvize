'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  DollarSign,
  Users,
  TrendingUp,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash,
  Download,
  BarChart3,
  Globe,
  Calendar,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

interface AffiliateStats {
  overview: {
    totalAffiliates: number
    totalReferrals: number
    totalConversions: number
    totalCommissions: number
    pendingCommissions: number
    paidCommissions: number
    conversionRate: number
    pendingPayoutAmount: number
  }
  activity: {
    clicksLast30Days: number
    conversionsLast30Days: number
    dailyActivity: Array<{
      date: string
      clicks: number
      conversions: number
    }>
  }
  tierDistribution: {
    bronze: number
    silver: number
    gold: number
    platinum: number
  }
  topAffiliates: Array<{
    id: string
    user_name: string
    user_email: string
    referral_code: string
    tier: string
    total_referrals: number
    total_earnings: number
    conversion_rate: number
  }>
  recentActivity: Array<{
    type: string
    affiliate_name: string
    amount: number
    date: string
    status: string
  }>
}

interface Affiliate {
  id: string
  user_id: string
  referral_code: string
  commission_rate: number
  tier: string
  status: string
  total_referrals: number
  total_earnings: number
  created_at: string
  updated_at: string
  users: {
    id: string
    name: string
    email: string
  }
}

export function AffiliateManagement() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  
  // Form states
  const [newAffiliate, setNewAffiliate] = useState({
    userId: '',
    commissionRate: 10,
    tier: 'bronze' as const,
    customReferralCode: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [statsResponse, affiliatesResponse] = await Promise.all([
        fetch('/api/admin/affiliates/stats'),
        fetch('/api/admin/affiliates')
      ])

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      if (affiliatesResponse.ok) {
        const affiliatesData = await affiliatesResponse.json()
        setAffiliates(affiliatesData.affiliates)
      }
    } catch (error) {
      console.error('Error loading affiliate data:', error)
      toast.error('Failed to load affiliate data')
    } finally {
      setLoading(false)
    }
  }

  const createAffiliate = async () => {
    try {
      const response = await fetch('/api/admin/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAffiliate)
      })

      if (response.ok) {
        toast.success('Affiliate program created successfully')
        setIsCreateModalOpen(false)
        setNewAffiliate({ userId: '', commissionRate: 10, tier: 'bronze', customReferralCode: '' })
        await loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create affiliate program')
      }
    } catch (error) {
      toast.error('Failed to create affiliate program')
    }
  }

  const updateAffiliate = async (id: string, updates: any) => {
    try {
      const response = await fetch(`/api/admin/affiliates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        toast.success('Affiliate updated successfully')
        await loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update affiliate')
      }
    } catch (error) {
      toast.error('Failed to update affiliate')
    }
  }

  const suspendAffiliate = async (id: string) => {
    if (!confirm('Are you sure you want to suspend this affiliate program?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/affiliates/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Affiliate program suspended')
        await loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to suspend affiliate')
      }
    } catch (error) {
      toast.error('Failed to suspend affiliate')
    }
  }

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'platinum': return 'bg-purple-100 text-purple-800 border-purple-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'bronze': return '🥉'
      case 'silver': return '🥈'
      case 'gold': return '🥇'
      case 'platinum': return '💎'
      default: return '⭐'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-300'
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'suspended': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter affiliates
  const filteredAffiliates = affiliates.filter(affiliate => {
    const matchesSearch = affiliate.users.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         affiliate.users.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         affiliate.referral_code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || affiliate.status === statusFilter
    const matchesTier = tierFilter === 'all' || affiliate.tier === tierFilter
    
    return matchesSearch && matchesStatus && matchesTier
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading affiliate management...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Affiliate Management</h1>
          <p className="text-gray-600 mt-1">Manage affiliate programs and track performance</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-dealvize-teal hover:bg-dealvize-teal-dark">
              <Plus className="h-4 w-4 mr-2" />
              Create Affiliate
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Affiliate Program</DialogTitle>
              <DialogDescription>
                Create a new affiliate program for a user
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  placeholder="Enter user ID"
                  value={newAffiliate.userId}
                  onChange={(e) => setNewAffiliate(prev => ({ ...prev, userId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  value={newAffiliate.commissionRate}
                  onChange={(e) => setNewAffiliate(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier">Tier</Label>
                <Select 
                  value={newAffiliate.tier} 
                  onValueChange={(value: any) => setNewAffiliate(prev => ({ ...prev, tier: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customCode">Custom Referral Code (Optional)</Label>
                <Input
                  id="customCode"
                  placeholder="Leave empty for auto-generation"
                  value={newAffiliate.customReferralCode}
                  onChange={(e) => setNewAffiliate(prev => ({ ...prev, customReferralCode: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createAffiliate}>Create Program</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Affiliates</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.overview.totalAffiliates}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Commissions</p>
                  <p className="text-2xl font-bold text-slate-900">${stats.overview.totalCommissions.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.overview.conversionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Payouts</p>
                  <p className="text-2xl font-bold text-slate-900">${stats.overview.pendingPayoutAmount.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="affiliates" className="w-full">
        <TabsList>
          <TabsTrigger value="affiliates">All Affiliates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="affiliates" className="space-y-6">
          {/* Filters */}
          <div className="flex items-center space-x-4 bg-white p-4 rounded-lg border">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search affiliates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {}}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Affiliates Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAffiliates.map((affiliate) => (
                    <TableRow key={affiliate.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{affiliate.users.name}</div>
                          <div className="text-sm text-gray-500">{affiliate.users.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {affiliate.referral_code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTierBadgeColor(affiliate.tier)}>
                          {getTierIcon(affiliate.tier)} {affiliate.tier.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(affiliate.status)}>
                          {affiliate.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{affiliate.total_referrals}</TableCell>
                      <TableCell>${affiliate.total_earnings.toFixed(2)}</TableCell>
                      <TableCell>{affiliate.commission_rate}%</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // View affiliate details
                              setSelectedAffiliate(affiliate)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Edit affiliate
                              setSelectedAffiliate(affiliate)
                              setIsEditModalOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => suspendAffiliate(affiliate.id)}
                            className="text-red-600"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tier Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.tierDistribution).map(([tier, count]) => (
                      <div key={tier} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span>{getTierIcon(tier)}</span>
                          <span className="capitalize">{tier}</span>
                        </div>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.topAffiliates.slice(0, 5).map((affiliate, index) => (
                      <div key={affiliate.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-dealvize-teal rounded-full flex items-center justify-center text-white text-xs">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{affiliate.user_name}</div>
                            <div className="text-xs text-gray-500">{affiliate.referral_code}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">${affiliate.total_earnings.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">{affiliate.total_referrals} referrals</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {stats && stats.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentActivity.slice(0, 10).map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{activity.affiliate_name}</p>
                        <p className="text-xs text-gray-500">
                          {activity.type} - {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {activity.status}
                        </Badge>
                        <p className="text-sm font-medium text-green-600 mt-1">
                          ${activity.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}