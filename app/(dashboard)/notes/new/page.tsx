'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, X } from "lucide-react"

export const dynamic = 'force-dynamic'

export default function NewNotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const dealId = searchParams.get('deal')
  const clientId = searchParams.get('client')
  const taskId = searchParams.get('task')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      setError('Please enter note content')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: content.trim(),
          deal_id: dealId || null,
          client_id: clientId || null,
          task_id: taskId || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create note')
      }

      // Navigate back to the originating page
      if (dealId) {
        router.push(`/deal/${dealId}`)
      } else if (clientId) {
        router.push(`/client/${clientId}`)
      } else if (taskId) {
        router.push(`/tasks`)
      } else {
        router.push('/notes')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (dealId) {
      router.push(`/deal/${dealId}`)
    } else if (clientId) {
      router.push(`/client/${clientId}`)
    } else if (taskId) {
      router.push(`/tasks`)
    } else {
      router.push('/notes')
    }
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-900">Add Note</h1>
              <Button variant="ghost" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </header>
          <main className="p-6">
            <BreadcrumbNav />
            
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Note</CardTitle>
                  {(dealId || clientId || taskId) && (
                    <p className="text-sm text-gray-600">
                      This note will be associated with the selected {dealId ? 'deal' : clientId ? 'client' : 'task'}.
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="content">Note Content</Label>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Enter your note here..."
                        rows={8}
                        className="mt-1"
                        required
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <Button 
                        type="submit" 
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Note
                          </>
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </SidebarInset>
    </>
  )
}