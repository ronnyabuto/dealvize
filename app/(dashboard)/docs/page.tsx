'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BookOpen, Download, ExternalLink, Code, Database, Shield, Zap } from "lucide-react"

export default function APIDocsPage() {
  const [spec, setSpec] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchApiSpec = async () => {
      try {
        const response = await fetch('/api/docs')
        if (response.ok) {
          const data = await response.json()
          setSpec(data)
        }
      } catch (error) {
        console.error('Failed to fetch API specification:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchApiSpec()
  }, [])

  const downloadSpec = (format: 'json' | 'yaml') => {
    const filename = `dealvize-api-spec.${format}`
    const url = `/api/docs${format === 'yaml' ? '?format=yaml' : ''}`
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 overflow-auto flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading API documentation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <h1 className="text-4xl font-bold text-gray-900">API Documentation</h1>
              </div>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Comprehensive REST API for the Dealvize CRM platform. Manage clients, deals, tasks, and more.
              </p>
              <div className="flex items-center justify-center space-x-4">
                <Badge variant="outline" className="px-3 py-1">
                  Version {spec?.info?.version || '1.0.0'}
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  OpenAPI 3.0.0
                </Badge>
              </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
                <TabsTrigger value="schemas">Schemas</TabsTrigger>
                <TabsTrigger value="examples">Examples</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="text-center">
                      <Database className="h-8 w-8 mx-auto text-green-600" />
                      <CardTitle>REST API</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 text-center">
                        Full REST API with CRUD operations for all resources
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="text-center">
                      <Shield className="h-8 w-8 mx-auto text-blue-600" />
                      <CardTitle>Secure</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 text-center">
                        JWT authentication and authorization for all endpoints
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="text-center">
                      <Zap className="h-8 w-8 mx-auto text-yellow-600" />
                      <CardTitle>Fast</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 text-center">
                        Optimized queries and caching for high performance
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="text-center">
                      <Code className="h-8 w-8 mx-auto text-purple-600" />
                      <CardTitle>Well Documented</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 text-center">
                        Complete OpenAPI specification with examples
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Getting Started</CardTitle>
                    <CardDescription>
                      Quick guide to start using the Dealvize API
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">1. Authentication</h4>
                      <p className="text-sm text-gray-600">
                        All API requests require authentication via Bearer token in the Authorization header:
                      </p>
                      <div className="bg-gray-100 p-3 rounded-md text-sm font-mono">
                        Authorization: Bearer YOUR_JWT_TOKEN
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold">2. Base URL</h4>
                      <p className="text-sm text-gray-600">
                        All API endpoints are relative to:
                      </p>
                      <div className="bg-gray-100 p-3 rounded-md text-sm font-mono">
                        {window.location.origin}/api
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold">3. Response Format</h4>
                      <p className="text-sm text-gray-600">
                        All responses follow a consistent format:
                      </p>
                      <div className="bg-gray-100 p-3 rounded-md text-sm font-mono">
                        {JSON.stringify({
                          success: true,
                          data: "...",
                          pagination: "... (for paginated endpoints)"
                        }, null, 2)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Download Specification</CardTitle>
                    <CardDescription>
                      Download the complete OpenAPI specification for integration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => downloadSpec('json')}
                        className="flex items-center space-x-2"
                      >
                        <Download className="h-4 w-4" />
                        <span>JSON</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => downloadSpec('yaml')}
                        className="flex items-center space-x-2"
                      >
                        <Download className="h-4 w-4" />
                        <span>YAML</span>
                      </Button>
                      <Button
                        variant="outline"
                        asChild
                        className="flex items-center space-x-2"
                      >
                        <a href="/api/docs" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          <span>Raw JSON</span>
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="endpoints" className="space-y-6">
                <ScrollArea className="h-96">
                  {spec?.paths && Object.entries(spec.paths).map(([path, methods]: [string, any]) => (
                    <Card key={path} className="mb-4">
                      <CardHeader>
                        <CardTitle className="text-lg font-mono">{path}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(methods).map(([method, config]: [string, any]) => (
                            <div key={method} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                              <Badge 
                                variant={method === 'get' ? 'default' : method === 'post' ? 'destructive' : 'secondary'}
                                className="uppercase text-xs"
                              >
                                {method}
                              </Badge>
                              <div className="flex-1">
                                <p className="font-medium">{config.summary}</p>
                                <p className="text-sm text-gray-600">{config.description}</p>
                              </div>
                              {config.tags && (
                                <div className="flex space-x-1">
                                  {config.tags.map((tag: string) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="schemas" className="space-y-6">
                <ScrollArea className="h-96">
                  {spec?.components?.schemas && Object.entries(spec.components.schemas).map(([name, schema]: [string, any]) => (
                    <Card key={name} className="mb-4">
                      <CardHeader>
                        <CardTitle className="font-mono">{name}</CardTitle>
                        <CardDescription>{schema.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-100 p-4 rounded-md">
                          <pre className="text-sm overflow-x-auto">
                            <code>{JSON.stringify(schema, null, 2)}</code>
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="examples" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Create Client</CardTitle>
                      <CardDescription>POST /api/clients</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-sm">Request:</h4>
                          <div className="bg-gray-100 p-3 rounded-md text-sm font-mono">
                            <pre>{JSON.stringify({
                              name: "John Doe",
                              email: "john@example.com",
                              phone: "555-123-4567",
                              company: "Acme Corp",
                              status: "prospect"
                            }, null, 2)}</pre>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">Response:</h4>
                          <div className="bg-gray-100 p-3 rounded-md text-sm font-mono">
                            <pre>{JSON.stringify({
                              success: true,
                              data: {
                                id: "123e4567-e89b-12d3-a456-426614174000",
                                name: "John Doe",
                                email: "john@example.com",
                                phone: "555-123-4567",
                                company: "Acme Corp",
                                status: "prospect",
                                created_at: "2025-01-09T12:00:00Z"
                              }
                            }, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Get Clients</CardTitle>
                      <CardDescription>GET /api/clients?page=1&limit=10</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-sm">Response:</h4>
                          <div className="bg-gray-100 p-3 rounded-md text-sm font-mono">
                            <pre>{JSON.stringify({
                              success: true,
                              data: [
                                {
                                  id: "123e4567-e89b-12d3-a456-426614174000",
                                  name: "John Doe",
                                  email: "john@example.com",
                                  status: "prospect"
                                }
                              ],
                              pagination: {
                                page: 1,
                                limit: 10,
                                total: 1,
                                totalPages: 1,
                                hasNext: false,
                                hasPrev: false
                              }
                            }, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Create Deal</CardTitle>
                      <CardDescription>POST /api/deals</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-sm">Request:</h4>
                          <div className="bg-gray-100 p-3 rounded-md text-sm font-mono">
                            <pre>{JSON.stringify({
                              client_id: "123e4567-e89b-12d3-a456-426614174000",
                              title: "Downtown Condo Sale",
                              value: 350000,
                              commission: 10500,
                              status: "negotiation",
                              probability: 75,
                              expected_close_date: "2025-03-15"
                            }, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Health Check</CardTitle>
                      <CardDescription>GET /api/health</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-sm">Response:</h4>
                          <div className="bg-gray-100 p-3 rounded-md text-sm font-mono">
                            <pre>{JSON.stringify({
                              status: "healthy",
                              timestamp: "2025-01-09T12:00:00Z",
                              version: "1.0.0",
                              environment: "production",
                              responseTime: "45.23ms",
                              checks: [
                                {
                                  name: "database",
                                  status: "healthy",
                                  responseTime: "12.45ms"
                                }
                              ],
                              summary: {
                                total: 1,
                                healthy: 1,
                                unhealthy: 0,
                                warnings: 0
                              }
                            }, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
    </div>
  )
}