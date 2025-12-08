// Super Admin User Management - Server Component
// Simple, Fast, Secure

import { redirect } from 'next/navigation'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentSuperAdmin, getAllUsers, isSuperAdmin } from '@/lib/auth/super-admin-clean'
import { Users, Plus, Shield, User, Building } from 'lucide-react'

export default async function SuperAdminUsersPage() {
  // Server-side authentication
  const { user, isSuperAdmin: isSuper } = await getCurrentSuperAdmin()
  
  if (!user) redirect('/auth/signin')
  if (!isSuper) redirect('/unauthorized')
  
  // Fetch all users (server-side)
  const allUsers = await getAllUsers()

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-800'
      case 'Broker': return 'bg-blue-100 text-blue-800'
      case 'Agent': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin': return <Shield className="h-3 w-3" />
      case 'Broker': return <Building className="h-3 w-3" />
      case 'Agent': return <User className="h-3 w-3" />
      default: return <User className="h-3 w-3" />
    }
  }

  const sidebarUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isSuperAdmin: true
  }

  return (
    <>
      <AppSidebar user={sidebarUser} />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                  <p className="text-sm text-gray-500">
                    Manage all platform users ({allUsers.length} total)
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main className="p-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold text-slate-900">{allUsers.length}</p>
                  <p className="text-sm text-gray-600">Total Users</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <p className="text-2xl font-bold text-slate-900">
                    {allUsers.filter(u => u.role === 'Admin').length}
                  </p>
                  <p className="text-sm text-gray-600">Admins</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <User className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold text-slate-900">
                    {allUsers.filter(u => u.role === 'Agent').length}
                  </p>
                  <p className="text-sm text-gray-600">Agents</p>
                </CardContent>
              </Card>
            </div>

            {/* Users List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Platform Users</CardTitle>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allUsers.map((platformUser) => (
                    <div key={platformUser.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                          {platformUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{platformUser.name}</h3>
                          <p className="text-gray-600">{platformUser.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className={getRoleColor(platformUser.role)}>
                              {getRoleIcon(platformUser.role)}
                              <span className="ml-1">{platformUser.role}</span>
                            </Badge>
                            {platformUser.phone && (
                              <span className="text-sm text-gray-500">• {platformUser.phone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right text-sm text-gray-500">
                          <p>Joined {new Date(platformUser.created_at).toLocaleDateString()}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </SidebarInset>
    </>
  )
}