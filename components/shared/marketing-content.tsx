"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Mail, Clock, TrendingUp, Send } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const emailTemplates = [
  {
    id: "1",
    name: "Welcome New Client",
    subject: "Welcome to our real estate services!",
    type: "Welcome",
    lastUsed: "2 days ago",
    usage: 45,
    status: "Active",
  },
  {
    id: "2",
    name: "Property Listing Alert",
    subject: "New property matches your criteria",
    type: "Listing",
    lastUsed: "1 day ago",
    usage: 128,
    status: "Active",
  },
  {
    id: "3",
    name: "Follow-up After Viewing",
    subject: "How did you like the property?",
    type: "Follow-up",
    lastUsed: "3 hours ago",
    usage: 67,
    status: "Active",
  },
  {
    id: "4",
    name: "Contract Reminder",
    subject: "Important: Contract deadline approaching",
    type: "Reminder",
    lastUsed: "1 week ago",
    usage: 23,
    status: "Draft",
  },
]

const automations = [
  {
    id: "1",
    name: "New Lead Nurture Sequence",
    trigger: "New client added",
    emails: 5,
    active: true,
    conversions: "12%",
  },
  {
    id: "2",
    name: "Post-Closing Follow-up",
    trigger: "Deal closed",
    emails: 3,
    active: true,
    conversions: "8%",
  },
]

export function MarketingContent() {
  return (
    <div className="space-y-6">
      {/* Marketing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Templates</p>
                <p className="text-2xl font-bold text-slate-900">24</p>
              </div>
              <Mail className="h-8 w-8 text-dealvize-teal" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sent This Month</p>
                <p className="text-2xl font-bold text-slate-900">1,247</p>
              </div>
              <Send className="h-8 w-8 text-dealvize-teal" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Rate</p>
                <p className="text-2xl font-bold text-slate-900">24.5%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-dealvize-teal" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Automations</p>
                <p className="text-2xl font-bold text-slate-900">8</p>
              </div>
              <Clock className="h-8 w-8 text-dealvize-teal" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {emailTemplates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900">{template.name}</h3>
                    <Badge variant={template.status === "Active" ? "default" : "secondary"}>{template.status}</Badge>
                    <Badge variant="outline">{template.type}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{template.subject}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Used {template.usage} times</span>
                    <span>Last used {template.lastUsed}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                  <Button size="sm" className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white">
                    Use
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem>View Analytics</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Automations */}
      <Card>
        <CardHeader>
          <CardTitle>Active Automations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {automations.map((automation) => (
              <div
                key={automation.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900">{automation.name}</h3>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Trigger: {automation.trigger}</span>
                    <span>{automation.emails} emails</span>
                    <span>Conversion: {automation.conversions}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                  <Button size="sm" variant="outline">
                    Analytics
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
