"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Database, Plus, Trash2, Users, Building2, CheckSquare, 
  AlertTriangle, CheckCircle, Loader2, RefreshCw 
} from "lucide-react"
import { toast } from "sonner"

interface SampleDataResults {
  clients: { created: number; deleted: number; errors: string[] }
  deals: { created: number; deleted: number; errors: string[] }
  tasks: { created: number; deleted: number; errors: string[] }
}

export function SampleDataManager() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SampleDataResults | null>(null)

  const addSampleData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/sample-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create sample data')
      }

      setResults(data.results)
      toast.success(`Successfully created ${data.summary.totalCreated} records!`)
      
      // Refresh the page after a short delay to show new data
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error) {
      console.error('Error creating sample data:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create sample data')
    } finally {
      setLoading(false)
    }
  }

  const deleteSampleData = async () => {
    if (!confirm('Are you sure you want to delete ALL your data? This cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/sample-data', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete data')
      }

      setResults(data.results)
      toast.success(`Successfully deleted ${data.summary.totalDeleted} records!`)
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error) {
      console.error('Error deleting data:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Sample Data Manager
        </CardTitle>
        <CardDescription>
          Add realistic real estate data to test your CRM or delete all data to start fresh
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sample Data Preview */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Sample data includes:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• <strong>5 Clients:</strong> Martinez Family, Emily Chen, Thompson couple, David Wilson, Rodriguez Family</li>
              <li>• <strong>5 Deals:</strong> $2.85M Beverly Hills home, $1.65M Manhattan Beach condo, $4.2M Malibu estate, etc.</li>
              <li>• <strong>7 Tasks:</strong> Walkthroughs, marketing photos, disclosures, financing follow-ups, CMAs</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={addSampleData}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Sample Data
          </Button>

          <Button
            onClick={deleteSampleData}
            disabled={loading}
            variant="destructive"
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete All Data
          </Button>

          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Results Display */}
        {results && (
          <div className="space-y-3">
            <h4 className="font-medium">Operation Results:</h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <div className="font-bold text-blue-900">
                  {results.clients.created || results.clients.deleted || 0}
                </div>
                <div className="text-xs text-blue-600">Clients</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="font-bold text-green-900">
                  {results.deals.created || results.deals.deleted || 0}
                </div>
                <div className="text-xs text-green-600">Deals</div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <CheckSquare className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <div className="font-bold text-purple-900">
                  {results.tasks.created || results.tasks.deleted || 0}
                </div>
                <div className="text-xs text-purple-600">Tasks</div>
              </div>
            </div>

            {/* Error Display */}
            {(results.clients.errors.length > 0 || 
              results.deals.errors.length > 0 || 
              results.tasks.errors.length > 0) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Some errors occurred:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    {results.clients.errors.map((error, i) => (
                      <li key={`client-${i}`}>• Client: {error}</li>
                    ))}
                    {results.deals.errors.map((error, i) => (
                      <li key={`deal-${i}`}>• Deal: {error}</li>
                    ))}
                    {results.tasks.errors.map((error, i) => (
                      <li key={`task-${i}`}>• Task: {error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
          <p><strong>Tip:</strong> Use sample data to test features, then delete it when you're ready to add real clients and deals.</p>
          <p className="mt-1"><strong>🔒 Security:</strong> All data is tied to your user account and completely private.</p>
        </div>
      </CardContent>
    </Card>
  )
}