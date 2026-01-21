// Super Admin Dashboard - Platform Management Focus
// Modern Next.js 15 - Clean, Fast, Secure

import { redirect } from 'next/navigation'
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCurrentSuperAdmin, getPlatformStats } from '@/lib/auth/super-admin-clean'
import { CommunicationCenter } from '@/components/superadmin/communication-center'
import { MobileEmergencyControls } from '@/components/superadmin/mobile-emergency-controls'
import { BusinessIntelligence } from '@/components/superadmin/business-intelligence'
import { AffiliateMonitoring } from '@/components/superadmin/affiliate-monitoring'
import { SuperAdminWrapper } from '@/components/superadmin/superadmin-wrapper'
import { 
  Crown, 
  Users, 
  Server, 
  Database, 
  Shield, 
  Activity,
  HardDrive,
  Cpu,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  FileText,
  Mail,
  UserCheck,
  TrendingUp,
  MessageSquare,
  Brain,
  Share2
} from 'lucide-react'
import Link from 'next/link'

export default async function SuperAdminPage() {
  // Server-side authentication and data fetching
  const { user, isSuperAdmin } = await getCurrentSuperAdmin()
  
  // Redirect if not authenticated or not super admin
  if (!user) redirect('/auth/signin')
  if (!isSuperAdmin) redirect('/unauthorized')
  
  const stats = await getPlatformStats()

  // Mock system health data - replace with real monitoring
  const systemHealth = {
    uptime: '99.9%',
    responseTime: '120ms',
    cpuUsage: 35,
    memoryUsage: 68,
    diskUsage: 42,
    activeUsers: Math.floor(stats.totalUsers * 0.3),
    errorRate: '0.02%'
  }

  return (
    <SuperAdminWrapper>
      <div className="min-h-screen bg-gray-50/50 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-lg">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Platform Management</h1>
                  <p className="text-sm text-gray-500">
                    System control center • Welcome back, {user.name}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-4 lg:p-6">
            
            {/* Mobile Emergency Controls - Only visible on mobile/tablet */}
            <div className="lg:hidden mb-6">
              <MobileEmergencyControls />
            </div>

            {/* System Health Overview & Quick Actions */}
            <section className="mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* System Health Metrics */}
                <div className="lg:col-span-3">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health & Monitoring</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">System Uptime</p>
                            <p className="text-xl font-bold text-green-600">{systemHealth.uptime}</p>
                            <p className="text-xs text-gray-500">Last 30 days</p>
                          </div>
                          <Activity className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Response Time</p>
                            <p className="text-xl font-bold text-blue-600">{systemHealth.responseTime}</p>
                            <p className="text-xs text-gray-500">Average</p>
                          </div>
                          <Wifi className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Active Users</p>
                            <p className="text-xl font-bold text-orange-600">{systemHealth.activeUsers}</p>
                            <p className="text-xs text-gray-500">Online now</p>
                          </div>
                          <Users className="h-8 w-8 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-red-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Error Rate</p>
                            <p className="text-xl font-bold text-red-600">{systemHealth.errorRate}</p>
                            <p className="text-xs text-gray-500">Last 24h</p>
                          </div>
                          <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Resource Usage */}
                  <div className="mt-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-4">Resource Usage</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Cpu className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-sm">CPU Usage</span>
                          </div>
                          <Progress value={systemHealth.cpuUsage} className="mb-2 h-2" />
                          <p className="text-xs text-gray-600">{systemHealth.cpuUsage}% of capacity</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Server className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-sm">Memory Usage</span>
                          </div>
                          <Progress value={systemHealth.memoryUsage} className="mb-2 h-2" />
                          <p className="text-xs text-gray-600">{systemHealth.memoryUsage}% of 16GB</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <HardDrive className="h-4 w-4 text-purple-500" />
                            <span className="font-medium text-sm">Disk Usage</span>
                          </div>
                          <Progress value={systemHealth.diskUsage} className="mb-2 h-2" />
                          <p className="text-xs text-gray-600">{systemHealth.diskUsage}% of 500GB</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                {/* Desktop Emergency Controls */}
                <div className="hidden lg:block">
                  <MobileEmergencyControls />
                </div>

              </div>
            </section>

            {/* Advanced Features Tabs */}
            <section>
              <Tabs defaultValue="management" className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="management" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Management</span>
                  </TabsTrigger>
                  <TabsTrigger value="communication" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">Communication</span>
                  </TabsTrigger>
                  <TabsTrigger value="intelligence" className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    <span className="hidden sm:inline">Intelligence</span>
                  </TabsTrigger>
                  <TabsTrigger value="affiliate" className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Affiliate</span>
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">Activity</span>
                  </TabsTrigger>
                </TabsList>

                {/* Platform Management */}
                <TabsContent value="management" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    {/* User Management */}
                    <Link href="/super-admin/users">
                      <Card className="cursor-pointer hover:shadow-md transition-all group border-l-4 border-l-dealvize-teal h-full">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4 mb-3">
                            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                              <UserCheck className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">User Management</h3>
                              <p className="text-sm text-gray-600">{stats.totalUsers} registered users</p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Manage user accounts, roles, and permissions across the platform
                          </p>
                        </CardContent>
                      </Card>
                    </Link>

                    {/* Blog Management */}
                    <Link href="/admin/blog">
                      <Card className="cursor-pointer hover:shadow-md transition-all group border-l-4 border-l-green-500 h-full">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4 mb-3">
                            <div className="p-2 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                              <FileText className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Blog Management</h3>
                              <p className="text-sm text-gray-600">Content & SEO</p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Create, edit, and publish blog posts for marketing and SEO
                          </p>
                        </CardContent>
                      </Card>
                    </Link>

                    {/* System Settings */}
                    <Card className="cursor-pointer hover:shadow-md transition-all group border-l-4 border-l-purple-500 h-full">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                            <Settings className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">System Config</h3>
                            <p className="text-sm text-gray-600">Global settings</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">
                          Configure platform-wide settings, integrations, and security
                        </p>
                      </CardContent>
                    </Card>

                    {/* Database Management */}
                    <Card className="cursor-pointer hover:shadow-md transition-all group border-l-4 border-l-red-500 h-full">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="p-2 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                            <Database className="h-6 w-6 text-red-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Database Tools</h3>
                            <p className="text-sm text-gray-600">Backups & migrations</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">
                          Database backups, maintenance, and performance monitoring
                        </p>
                      </CardContent>
                    </Card>

                    {/* Email Management */}
                    <Card className="cursor-pointer hover:shadow-md transition-all group border-l-4 border-l-yellow-500 h-full">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="p-2 bg-yellow-50 rounded-lg group-hover:bg-yellow-100 transition-colors">
                            <Mail className="h-6 w-6 text-yellow-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Email System</h3>
                            <p className="text-sm text-gray-600">Templates & delivery</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">
                          Manage email templates, delivery rates, and notifications
                        </p>
                      </CardContent>
                    </Card>

                    {/* Analytics & Reports */}
                    <Card className="cursor-pointer hover:shadow-md transition-all group border-l-4 border-l-indigo-500 h-full">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                            <TrendingUp className="h-6 w-6 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Platform Analytics</h3>
                            <p className="text-sm text-gray-600">Usage & performance</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">
                          View platform usage statistics, performance metrics, and trends
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Communication Center */}
                <TabsContent value="communication">
                  <CommunicationCenter totalUsers={stats.totalUsers} />
                </TabsContent>

                {/* Business Intelligence */}
                <TabsContent value="intelligence">
                  <BusinessIntelligence />
                </TabsContent>

                {/* Affiliate Monitoring */}
                <TabsContent value="affiliate">
                  <AffiliateMonitoring />
                </TabsContent>

                {/* Recent Activity */}
                <TabsContent value="activity">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Recent Platform Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {stats.recentUsers?.slice(0, 10).map((user: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-dealvize-teal rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {user.name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div>
                                <p className="font-medium text-sm">New user registration</p>
                                <p className="text-xs text-gray-500">{user.name} ({user.email})</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="text-xs">{user.role || 'User'}</Badge>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(user.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        )) || (
                          <div className="text-center py-8 text-gray-500">
                            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No recent activity to display</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </section>

          </main>
      </div>
    </SuperAdminWrapper>
  )
}