"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { 
  Building2, Users, Settings, Crown, Shield, UserPlus, Mail, 
  MoreVertical, Edit, Trash2, Check, X, Clock, Globe, 
  Palette, Database, Zap, BarChart3, Star, AlertTriangle,
  Copy, Eye, EyeOff, Key, Download
} from "lucide-react"
import { toast } from "sonner"

interface Tenant {
  id: string
  name: string
  subdomain: string
  plan_type: string
  industry?: string
  company_size?: string
  status: string
  created_at: string
  updated_at?: string
  settings?: any
  branding?: any
  user_membership?: {
    role: string
    permissions: string[]
    status: string
    joined_at: string
  }
}

interface TenantMember {
  id: string
  user_id: string
  role: string
  permissions: string[]
  status: string
  joined_at: string
  user: {
    id: string
    email: string
    full_name: string
    avatar_url?: string
    last_sign_in_at?: string
  }
  invited_by_user?: {
    id: string
    email: string
    full_name: string
  }
}

const ROLES = [
  { value: 'owner', label: 'Owner', description: 'Full access to everything', color: 'bg-purple-100 text-purple-800' },
  { value: 'admin', label: 'Admin', description: 'Manage settings and users', color: 'bg-red-100 text-red-800' },
  { value: 'manager', label: 'Manager', description: 'Manage team and deals', color: 'bg-blue-100 text-blue-800' },
  { value: 'member', label: 'Member', description: 'Standard access', color: 'bg-green-100 text-green-800' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access', color: 'bg-gray-100 text-gray-800' }
]

const PERMISSIONS = [
  'view_leads', 'manage_own_leads', 'manage_all_leads',
  'view_deals', 'manage_own_deals', 'manage_all_deals',
  'view_reports', 'manage_settings', 'manage_members',
  'manage_billing', 'manage_integrations', 'view_activity_logs'
]

export function TenantManagement() {
  const [activeTab, setActiveTab] = useState('overview')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [members, setMembers] = useState<TenantMember[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateTenant, setShowCreateTenant] = useState(false)
  const [showInviteMember, setShowInviteMember] = useState(false)
  const [newTenant, setNewTenant] = useState({
    name: '',
    subdomain: '',
    plan_type: 'starter',
    industry: '',
    company_size: ''
  })
  const [memberInvite, setMemberInvite] = useState({
    email: '',
    role: 'member',
    permissions: [] as string[],
    invite_message: ''
  })

  useEffect(() => {
    fetchTenants()
  }, [])

  useEffect(() => {
    if (selectedTenant) {
      fetchTenantMembers()
    }
  }, [selectedTenant])

  const fetchTenants = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/tenants?include_members=true')
      if (!response.ok) throw new Error('Failed to fetch tenants')
      
      const data = await response.json()
      setTenants(data.tenants || [])
      
      if (data.tenants?.length > 0 && !selectedTenant) {
        setSelectedTenant(data.tenants[0])
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
      toast.error('Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  const fetchTenantMembers = async () => {
    if (!selectedTenant) return

    try {
      const response = await fetch(`/api/tenant-members?tenant_id=${selectedTenant.id}`)
      if (!response.ok) throw new Error('Failed to fetch members')
      
      const data = await response.json()
      setMembers(data.members || [])
    } catch (error) {
      console.error('Error fetching members:', error)
      toast.error('Failed to load team members')
    }
  }

  const createTenant = async () => {
    if (!newTenant.name || !newTenant.subdomain) {
      toast.error('Name and subdomain are required')
      return
    }

    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTenant)
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tenant')
      }

      toast.success('Organization created successfully')
      
      setShowCreateTenant(false)
      setNewTenant({
        name: '',
        subdomain: '',
        plan_type: 'starter',
        industry: '',
        company_size: ''
      })
      
      await fetchTenants()
      setSelectedTenant(data.tenant)
    } catch (error) {
      console.error('Error creating tenant:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create organization')
    }
  }

  const inviteMember = async () => {
    if (!memberInvite.email || !selectedTenant) {
      toast.error('Email is required')
      return
    }

    try {
      const response = await fetch('/api/tenant-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: selectedTenant.id,
          ...memberInvite
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite member')
      }

      toast.success(data.message || 'Member invited successfully')
      
      setShowInviteMember(false)
      setMemberInvite({
        email: '',
        role: 'member',
        permissions: [],
        invite_message: ''
      })
      
      await fetchTenantMembers()
    } catch (error) {
      console.error('Error inviting member:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to invite member')
    }
  }

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/tenant-members?id=${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update member')
      }

      toast.success('Member role updated successfully')
      await fetchTenantMembers()
    } catch (error) {
      console.error('Error updating member:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update member')
    }
  }

  const removeMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/tenant-members?id=${memberId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove member')
      }

      toast.success('Member removed successfully')
      await fetchTenantMembers()
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to remove member')
    }
  }

  const updateTenantSettings = async (settings: any) => {
    if (!selectedTenant) return

    try {
      const response = await fetch(`/api/tenants?id=${selectedTenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update settings')
      }

      toast.success('Settings updated successfully')
      await fetchTenants()
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update settings')
    }
  }

  const getRoleInfo = (role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[ROLES.length - 1]
  }

  const getPlanColor = (planType: string) => {
    const colors = {
      starter: 'bg-green-100 text-green-800',
      professional: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800'
    }
    return colors[planType as keyof typeof colors] || colors.starter
  }

  const formatSubdomain = (subdomain: string) => {
    return `${subdomain}.dealvize.com`
  }

  const copySubdomain = (subdomain: string) => {
    navigator.clipboard.writeText(`https://${formatSubdomain(subdomain)}`)
    toast.success('URL copied to clipboard')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Building2 className="h-12 w-12 mx-auto animate-pulse text-primary" />
          <div>
            <p className="text-lg font-medium">Loading Organizations</p>
            <p className="text-sm text-muted-foreground">Setting up your workspace...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Management
              </CardTitle>
              <CardDescription>
                Manage your organizations, teams, and permissions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select 
                value={selectedTenant?.id || ''} 
                onValueChange={(value) => {
                  const tenant = tenants.find(t => t.id === value)
                  setSelectedTenant(tenant || null)
                }}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {tenant.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Dialog open={showCreateTenant} onOpenChange={setShowCreateTenant}>
                <DialogTrigger asChild>
                  <Button>
                    <Building2 className="h-4 w-4 mr-2" />
                    New Organization
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Organization</DialogTitle>
                    <DialogDescription>
                      Set up a new organization with its own workspace and team
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="org-name">Organization Name *</Label>
                        <Input
                          id="org-name"
                          value={newTenant.name}
                          onChange={(e) => setNewTenant({...newTenant, name: e.target.value})}
                          placeholder="e.g., Acme Real Estate"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subdomain">Subdomain *</Label>
                        <div className="flex items-center">
                          <Input
                            id="subdomain"
                            value={newTenant.subdomain}
                            onChange={(e) => setNewTenant({...newTenant, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                            placeholder="acme"
                            className="rounded-r-none"
                          />
                          <span className="px-3 py-2 bg-muted border border-l-0 rounded-r-md text-sm text-muted-foreground">
                            .dealvize.com
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Plan Type</Label>
                        <Select value={newTenant.plan_type} onValueChange={(value) => setNewTenant({...newTenant, plan_type: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="starter">Starter</SelectItem>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Company Size</Label>
                        <Select value={newTenant.company_size} onValueChange={(value) => setNewTenant({...newTenant, company_size: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-10">1-10 employees</SelectItem>
                            <SelectItem value="11-50">11-50 employees</SelectItem>
                            <SelectItem value="51-200">51-200 employees</SelectItem>
                            <SelectItem value="201-1000">201-1000 employees</SelectItem>
                            <SelectItem value="1000+">1000+ employees</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input
                        value={newTenant.industry}
                        onChange={(e) => setNewTenant({...newTenant, industry: e.target.value})}
                        placeholder="e.g., Real Estate, Technology"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateTenant(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createTenant} disabled={!newTenant.name || !newTenant.subdomain}>
                      Create Organization
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedTenant ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="members">Team Members</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="usage">Usage & Limits</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Plan</p>
                          <Badge className={getPlanColor(selectedTenant.plan_type)}>
                            {selectedTenant.plan_type}
                          </Badge>
                        </div>
                        <Crown className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                          <p className="text-2xl font-bold">{members.length}</p>
                        </div>
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Status</p>
                          <Badge variant={selectedTenant.status === 'active' ? 'success' : 'destructive'}>
                            {selectedTenant.status}
                          </Badge>
                        </div>
                        <Shield className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Created</p>
                          <p className="text-sm">{new Date(selectedTenant.created_at).toLocaleDateString()}</p>
                        </div>
                        <Clock className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Organization Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Organization Name</Label>
                        <p className="text-sm font-medium">{selectedTenant.name}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Subdomain</Label>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{formatSubdomain(selectedTenant.subdomain)}</p>
                          <Button variant="ghost" size="sm" onClick={() => copySubdomain(selectedTenant.subdomain)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {selectedTenant.industry && (
                        <div className="space-y-2">
                          <Label>Industry</Label>
                          <p className="text-sm font-medium">{selectedTenant.industry}</p>
                        </div>
                      )}

                      {selectedTenant.company_size && (
                        <div className="space-y-2">
                          <Label>Company Size</Label>
                          <p className="text-sm font-medium">{selectedTenant.company_size}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Your Role</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedTenant.user_membership && (
                        <>
                          <div className="space-y-2">
                            <Label>Role</Label>
                            <Badge className={getRoleInfo(selectedTenant.user_membership.role).color}>
                              {getRoleInfo(selectedTenant.user_membership.role).label}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Permissions</Label>
                            <div className="flex flex-wrap gap-1">
                              {selectedTenant.user_membership.permissions?.slice(0, 3).map((permission, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {permission.replace('_', ' ')}
                                </Badge>
                              ))}
                              {selectedTenant.user_membership.permissions?.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{selectedTenant.user_membership.permissions.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Member Since</Label>
                            <p className="text-sm">{new Date(selectedTenant.user_membership.joined_at).toLocaleDateString()}</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="members" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Team Members</h3>
                    <p className="text-sm text-muted-foreground">Manage your organization's team members and their roles</p>
                  </div>
                  
                  <Dialog open={showInviteMember} onOpenChange={setShowInviteMember}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                        <DialogDescription>
                          Send an invitation to join your organization
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="invite-email">Email Address *</Label>
                          <Input
                            id="invite-email"
                            type="email"
                            value={memberInvite.email}
                            onChange={(e) => setMemberInvite({...memberInvite, email: e.target.value})}
                            placeholder="colleague@company.com"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={memberInvite.role} onValueChange={(value) => setMemberInvite({...memberInvite, role: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.filter(role => role.value !== 'owner').map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  <div>
                                    <p className="font-medium">{role.label}</p>
                                    <p className="text-xs text-muted-foreground">{role.description}</p>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Personal Message (Optional)</Label>
                          <Textarea
                            value={memberInvite.invite_message}
                            onChange={(e) => setMemberInvite({...memberInvite, invite_message: e.target.value})}
                            placeholder="Add a personal note to the invitation..."
                            rows={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowInviteMember(false)}>
                          Cancel
                        </Button>
                        <Button onClick={inviteMember} disabled={!memberInvite.email}>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Invitation
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Last Active</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={member.user.avatar_url} />
                                  <AvatarFallback>
                                    {member.user.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{member.user.full_name}</p>
                                  <p className="text-sm text-muted-foreground">{member.user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleInfo(member.role).color}>
                                {getRoleInfo(member.role).label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{new Date(member.joined_at).toLocaleDateString()}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {member.user.last_sign_in_at 
                                  ? new Date(member.user.last_sign_in_at).toLocaleDateString()
                                  : 'Never'
                                }
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={member.status === 'active' ? 'success' : 'secondary'}>
                                {member.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Manage Member</DialogTitle>
                                    <DialogDescription>
                                      Update {member.user.full_name}'s role and permissions
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Role</Label>
                                      <Select 
                                        value={member.role} 
                                        onValueChange={(value) => updateMemberRole(member.id, value)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {ROLES.filter(role => role.value !== 'owner' || member.role === 'owner').map((role) => (
                                            <SelectItem key={role.value} value={role.value}>
                                              {role.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    {member.role !== 'owner' && (
                                      <Button 
                                        variant="destructive" 
                                        onClick={() => removeMember(member.id)}
                                        className="w-full"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Remove Member
                                      </Button>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">General Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Timezone</Label>
                        <Select defaultValue={selectedTenant.settings?.timezone || 'UTC'}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Chicago">Central Time</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select defaultValue={selectedTenant.settings?.currency || 'USD'}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="CAD">CAD ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Date Format</Label>
                        <Select defaultValue={selectedTenant.settings?.date_format || 'MM/DD/YYYY'}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Feature Access</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">AI Scoring</p>
                          <p className="text-sm text-muted-foreground">AI-powered lead scoring</p>
                        </div>
                        <Switch 
                          checked={selectedTenant.settings?.features?.ai_scoring || false}
                          disabled={selectedTenant.plan_type === 'starter'}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Advanced Automation</p>
                          <p className="text-sm text-muted-foreground">Complex workflow automation</p>
                        </div>
                        <Switch 
                          checked={selectedTenant.settings?.features?.advanced_automation || false}
                          disabled={selectedTenant.plan_type !== 'enterprise'}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">API Access</p>
                          <p className="text-sm text-muted-foreground">REST API and webhooks</p>
                        </div>
                        <Switch 
                          checked={selectedTenant.settings?.features?.api_access || false}
                          disabled={selectedTenant.plan_type === 'starter'}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">White Labeling</p>
                          <p className="text-sm text-muted-foreground">Custom branding</p>
                        </div>
                        <Switch 
                          checked={selectedTenant.settings?.features?.white_labeling || false}
                          disabled={selectedTenant.plan_type !== 'enterprise'}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="branding" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Brand Customization</CardTitle>
                    <CardDescription>
                      Customize the appearance of your workspace
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Primary Color</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={selectedTenant.branding?.primary_color || '#3b82f6'}
                              className="w-12 h-10 p-1 border rounded"
                            />
                            <Input
                              value={selectedTenant.branding?.primary_color || '#3b82f6'}
                              placeholder="#3b82f6"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Secondary Color</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={selectedTenant.branding?.secondary_color || '#64748b'}
                              className="w-12 h-10 p-1 border rounded"
                            />
                            <Input
                              value={selectedTenant.branding?.secondary_color || '#64748b'}
                              placeholder="#64748b"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Logo URL</Label>
                          <Input
                            value={selectedTenant.branding?.logo_url || ''}
                            placeholder="https://example.com/logo.png"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Favicon URL</Label>
                          <Input
                            value={selectedTenant.branding?.favicon_url || ''}
                            placeholder="https://example.com/favicon.ico"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Custom CSS</Label>
                          <Textarea
                            value={selectedTenant.branding?.custom_css || ''}
                            placeholder="/* Custom styles here */"
                            rows={8}
                            className="font-mono text-xs"
                          />
                        </div>

                        <Button className="w-full">
                          <Palette className="h-4 w-4 mr-2" />
                          Save Branding
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="usage" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Current Usage</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedTenant.settings?.limits && Object.entries(selectedTenant.settings.limits).map(([key, limit]) => (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="capitalize">{key.replace(/max_|_/g, ' ').trim()}</Label>
                            <span className="text-sm text-muted-foreground">
                              {limit === -1 ? 'Unlimited' : `0 / ${limit}`}
                            </span>
                          </div>
                          {limit !== -1 && (
                            <Progress value={0} className="h-2" />
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Plan Limits</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center p-4 border rounded-lg">
                        <Badge className={getPlanColor(selectedTenant.plan_type)} size="lg">
                          {selectedTenant.plan_type} Plan
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-2">
                          {selectedTenant.plan_type === 'enterprise' ? 'Unlimited access to all features' : 'Limited access based on your plan'}
                        </p>
                      </div>

                      <Button variant="outline" className="w-full">
                        <Star className="h-4 w-4 mr-2" />
                        Upgrade Plan
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No organizations found</p>
              <Button onClick={() => setShowCreateTenant(true)}>
                <Building2 className="h-4 w-4 mr-2" />
                Create Your First Organization
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}