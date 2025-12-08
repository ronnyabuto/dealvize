"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Users, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Shield, 
  User,
  Calendar,
  Activity,
  Mail,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

interface TeamMember {
  id: string
  email: string
  role: 'admin' | 'member'
  status: 'active' | 'pending' | 'inactive'
  last_active: string
  invited_date: string
  activity_summary: {
    deals_created: number
    clients_added: number
    tasks_completed: number
    last_login: string
  }
}

interface TeamMemberListProps {
  members: TeamMember[]
}

export function TeamMemberList({ members }: TeamMemberListProps) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-3 w-3" />
      case 'pending': return <Clock className="h-3 w-3" />
      case 'inactive': return <AlertTriangle className="h-3 w-3" />
      default: return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return formatDate(dateString)
  }

  const handleResendInvite = async (memberId: string, email: string) => {
    try {
      const response = await fetch('/api/admin/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      })
      
      if (response.ok) {
        alert(`Invitation resent to ${email}`)
      } else {
        throw new Error('Failed to resend invitation')
      }
    } catch (error) {
      alert('Failed to resend invitation')
    }
  }

  const handleRemoveMember = async (memberId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the team?`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/remove-member', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      })
      
      if (response.ok) {
        window.location.reload()
      } else {
        throw new Error('Failed to remove member')
      }
    } catch (error) {
      alert('Failed to remove team member')
    }
  }

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'member') => {
    try {
      const response = await fetch('/api/admin/change-role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole })
      })
      
      if (response.ok) {
        window.location.reload()
      } else {
        throw new Error('Failed to change role')
      }
    } catch (error) {
      alert('Failed to change member role')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No team members yet</p>
            <p className="text-sm">Invite your first team member to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 border-b pb-2">
              <div className="col-span-3">Member</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Last Active</div>
              <div className="col-span-2">Activity</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* Team Members */}
            {members.map((member) => (
              <div key={member.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Member Info */}
                  <div className="col-span-1 md:col-span-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-dealvize-teal rounded-full flex items-center justify-center text-white font-medium">
                        {member.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.email}</p>
                        <p className="text-xs text-gray-500">
                          Joined {formatDate(member.invited_date)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="col-span-1 md:col-span-2">
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                      {member.role === 'admin' ? <Shield className="h-3 w-3 mr-1" /> : <User className="h-3 w-3 mr-1" />}
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </Badge>
                  </div>

                  {/* Status */}
                  <div className="col-span-1 md:col-span-2">
                    <Badge variant="secondary" className={getStatusColor(member.status)}>
                      {getStatusIcon(member.status)}
                      <span className="ml-1">{member.status.charAt(0).toUpperCase() + member.status.slice(1)}</span>
                    </Badge>
                  </div>

                  {/* Last Active */}
                  <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Activity className="h-3 w-3" />
                      {formatLastActive(member.last_active)}
                    </div>
                  </div>

                  {/* Activity Summary */}
                  <div className="col-span-1 md:col-span-2">
                    <div className="text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        {member.activity_summary.deals_created}D, {member.activity_summary.clients_added}C, {member.activity_summary.tasks_completed}T
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 md:col-span-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.status === 'pending' && (
                          <>
                            <DropdownMenuItem onClick={() => handleResendInvite(member.id, member.email)}>
                              <Mail className="h-4 w-4 mr-2" />
                              Resend Invite
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {member.status !== 'pending' && (
                          <>
                            <DropdownMenuItem onClick={() => handleChangeRole(member.id, member.role === 'admin' ? 'member' : 'admin')}>
                              <Edit className="h-4 w-4 mr-2" />
                              Make {member.role === 'admin' ? 'Member' : 'Admin'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleRemoveMember(member.id, member.email)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Mobile Activity Details */}
                <div className="md:hidden mt-3 pt-3 border-t">
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div className="text-center">
                      <p className="font-medium">{member.activity_summary.deals_created}</p>
                      <p className="text-gray-500">Deals</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{member.activity_summary.clients_added}</p>
                      <p className="text-gray-500">Clients</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{member.activity_summary.tasks_completed}</p>
                      <p className="text-gray-500">Tasks</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}