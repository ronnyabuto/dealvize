"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Users, 
  UserPlus, 
  Activity,
  Settings,
  Crown,
  Mail,
  Calendar,
  BarChart3,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Edit,
  Eye
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TeamMemberInvite } from "@/components/shared/team-member-invite"
import { TeamMemberList } from "@/components/shared/team-member-list"
import { ActivityMonitor } from "@/components/shared/activity-monitor"
import { LeadAssignment } from "@/components/features/clients/lead-assignment"

interface AdminData {
  plan: {
    name: string
    max_users: number
    current_users: number
    features: string[]
  }
  team_members: Array<{
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
  }>
  recent_activity: Array<{
    id: string
    user_email: string
    action: string
    resource_type: string
    resource_id: string
    timestamp: string
    details: string
  }>
  system_stats: {
    total_deals: number
    total_clients: number
    total_tasks: number
    total_revenue: number
    active_users_today: number
  }
}

interface AdminDashboardProps {
  data: AdminData | null
}

export function AdminDashboard({ data }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'activity' | 'assignments'>('overview')

  if (!data) {
    return <div>Loading admin data...</div>
  }

  const usagePercentage = (data.plan.current_users / data.plan.max_users) * 100
  const remainingSlots = data.plan.max_users - data.plan.current_users

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'team', label: 'Team Management', icon: Users },
    { id: 'activity', label: 'Activity Monitor', icon: Activity },
    { id: 'assignments', label: 'Lead Assignment', icon: Settings }
  ]

  return (
    <div className="space-y-6">
      {/* Plan Usage Alert */}
      {remainingSlots <= 2 && (
        <Alert className={remainingSlots === 0 ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}>
          <AlertTriangle className={`h-4 w-4 ${remainingSlots === 0 ? 'text-red-600' : 'text-yellow-600'}`} />
          <AlertDescription className={remainingSlots === 0 ? 'text-red-800' : 'text-yellow-800'}>
            {remainingSlots === 0 
              ? 'You have reached your plan limit. Upgrade to add more team members.'
              : `Only ${remainingSlots} user slots remaining on your ${data.plan.name} plan.`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-2xl font-bold text-slate-900">
                  {data.plan.current_users}/{data.plan.max_users}
                </p>
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <Crown className="h-3 w-3 mr-1" />
                  {data.plan.name} Plan
                </div>
              </div>
              <Users className="h-8 w-8 text-dealvize-teal" />
            </div>
            <div className="mt-4">
              <Progress value={usagePercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Today</p>
                <p className="text-2xl font-bold text-slate-900">{data.system_stats.active_users_today}</p>
                <p className="text-xs text-green-600 mt-2">Users logged in</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900">
                  ${data.system_stats.total_revenue.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600 mt-2">Team performance</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <p className="text-2xl font-bold text-green-600">Excellent</p>
                <p className="text-xs text-gray-600 mt-2">All systems operational</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-dealvize-teal text-dealvize-teal'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab data={data} />}
      {activeTab === 'team' && <TeamTab data={data} remainingSlots={remainingSlots} />}
      {activeTab === 'activity' && <ActivityTab data={data} />}
      {activeTab === 'assignments' && <AssignmentsTab data={data} />}
    </div>
  )
}

function OverviewTab({ data }: { data: AdminData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Total Deals</p>
              <p className="text-2xl font-bold text-blue-600">{data.system_stats.total_deals}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-green-600">{data.system_stats.total_clients}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-purple-600">{data.system_stats.total_tasks}</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-yellow-600">{data.system_stats.active_users_today}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.plan.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TeamTab({ data, remainingSlots }: { data: AdminData; remainingSlots: number }) {
  return (
    <div className="space-y-6">
      <TeamMemberInvite remainingSlots={remainingSlots} />
      <TeamMemberList members={data.team_members} />
    </div>
  )
}

function ActivityTab({ data }: { data: AdminData }) {
  return <ActivityMonitor activities={data.recent_activity} />
}

function AssignmentsTab({ data }: { data: AdminData }) {
  return <LeadAssignment teamMembers={data.team_members} />
}