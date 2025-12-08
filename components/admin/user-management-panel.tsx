'use client'

/**
 * User Management Panel
 * Comprehensive user administration interface for tenant admins
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  UserPlus, 
  Mail, 
  MoreHorizontal, 
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  UserCheck,
  UserX,
  Shield
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useRBAC } from '@/lib/rbac/context'
import { SYSTEM_ROLES } from '@/lib/rbac/permissions'

interface TenantMember {
  id: string
  user_id: string
  email: string
  name: string
  role: string
  status: 'active' | 'inactive' | 'pending'
  joined_at: string
  last_active?: string
  avatar_url?: string
}

interface UserInvitation {
  id: string
  email: string
  role: string
  status: 'pending' | 'expired' | 'accepted'
  invited_at: string
  expires_at: string
  invited_by: string
}

const InviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Role is required'),
  sendWelcomeEmail: z.boolean().default(true)
})

type InviteUserForm = z.infer<typeof InviteUserSchema>

interface UserManagementPanelProps {
  onStatsChange?: () => void
}

export function UserManagementPanel({ onStatsChange }: UserManagementPanelProps) {
  const { currentTenant, userPermissions } = useRBAC()
  const [members, setMembers] = useState<TenantMember[]>([])
  const [invitations, setInvitations] = useState<UserInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('members')

  const inviteForm = useForm<InviteUserForm>({
    resolver: zodResolver(InviteUserSchema),
    defaultValues: {
      sendWelcomeEmail: true
    }
  })

  // Load team members and invitations
  useEffect(() => {
    if (currentTenant) {
      loadTeamData()
    }
  }, [currentTenant])

  const loadTeamData = async () => {
    try {
      setLoading(true)
      
      const [membersResponse, invitationsResponse] = await Promise.all([
        fetch('/api/admin/team-members'),
        fetch('/api/admin/invitations')
      ])

      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        setMembers(membersData.members || [])
      }

      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json()
        setInvitations(invitationsData.invitations || [])
      }
    } catch (error) {
      console.error('Error loading team data:', error)
      toast.error('Failed to load team data')
    } finally {
      setLoading(false)
    }
  }

  // Filter members based on search and filters
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter
    const matchesRole = roleFilter === 'all' || member.role === roleFilter

    return matchesSearch && matchesStatus && matchesRole
  })

  // Invite new user
  const onInviteSubmit = async (data: InviteUserForm) => {
    try {
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message || 'Invitation sent successfully')
        setShowInviteDialog(false)
        inviteForm.reset()
        loadTeamData()
        onStatsChange?.()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send invitation')
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast.error('Failed to send invitation')
    }
  }

  // Update member role
  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/team-members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        toast.success('Member role updated successfully')
        loadTeamData()
        onStatsChange?.()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update member role')
      }
    } catch (error) {
      console.error('Error updating member role:', error)
      toast.error('Failed to update member role')
    }
  }

  // Remove member
  const removeMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from your team?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/team-members/${memberId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Member removed successfully')
        loadTeamData()
        onStatsChange?.()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Failed to remove member')
    }
  }

  // Resend invitation
  const resendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/admin/invitations/${invitationId}/resend`, {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Invitation resent successfully')
        loadTeamData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to resend invitation')
      }
    } catch (error) {
      console.error('Error resending invitation:', error)
      toast.error('Failed to resend invitation')
    }
  }

  // Cancel invitation
  const cancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/invitations/${invitationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Invitation cancelled successfully')
        loadTeamData()
        onStatsChange?.()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to cancel invitation')
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      toast.error('Failed to cancel invitation')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { variant: 'default', className: 'bg-green-100 text-green-800' },
      inactive: { variant: 'secondary', className: 'bg-gray-100 text-gray-800' },
      pending: { variant: 'outline', className: 'bg-yellow-100 text-yellow-800' }
    }
    
    return variants[status] || variants.inactive
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = SYSTEM_ROLES.find(r => r.id === role)
    return roleConfig ? { 
      name: roleConfig.name, 
      color: roleConfig.color,
      icon: roleConfig.icon 
    } : { name: role, color: '#6b7280', icon: '👤' }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-gray-600">Manage your team members and invitations</p>
        </div>
        
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New Team Member</DialogTitle>
            </DialogHeader>
            
            <Form {...inviteForm}>
              <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                <FormField
                  control={inviteForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="user@example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        They'll receive an invitation to join your team
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={inviteForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SYSTEM_ROLES.filter(role => role.id !== 'owner').map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              <div className="flex items-center gap-2">
                                <span>{role.icon}</span>
                                <div>
                                  <div className="font-medium">{role.name}</div>
                                  <div className="text-sm text-gray-500">{role.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowInviteDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={inviteForm.formState.isSubmitting}>
                    {inviteForm.formState.isSubmitting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Team Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            <Mail className="h-4 w-4 mr-2" />
            Invitations ({invitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {SYSTEM_ROLES.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Members Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => {
                    const statusBadge = getStatusBadge(member.status)
                    const roleBadge = getRoleBadge(member.role)
                    
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatar_url} />
                              <AvatarFallback>
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{member.name}</div>
                              <div className="text-sm text-gray-500">{member.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            style={{ borderColor: roleBadge.color, color: roleBadge.color }}
                          >
                            {roleBadge.icon} {roleBadge.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge {...statusBadge}>
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(member.joined_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {member.last_active ? 
                            new Date(member.last_active).toLocaleDateString() : 
                            'Never'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Select onValueChange={(role) => updateMemberRole(member.id, role)}>
                              <SelectTrigger className="w-[100px] h-8">
                                <SelectValue placeholder="Role" />
                              </SelectTrigger>
                              <SelectContent>
                                {SYSTEM_ROLES.filter(role => 
                                  role.id !== 'owner' && role.id !== member.role
                                ).map((role) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeMember(member.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => {
                    const roleBadge = getRoleBadge(invitation.role)
                    const isExpired = new Date(invitation.expires_at) < new Date()
                    
                    return (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            style={{ borderColor: roleBadge.color, color: roleBadge.color }}
                          >
                            {roleBadge.icon} {roleBadge.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={isExpired ? 'destructive' : invitation.status === 'pending' ? 'outline' : 'default'}
                          >
                            {isExpired ? 'Expired' : invitation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(invitation.invited_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!isExpired && invitation.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendInvitation(invitation.id)}
                              >
                                Resend
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelInvitation(invitation.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}