'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react'

interface LogEntry {
    id: string
    level: 'info' | 'warn' | 'error' | 'debug'
    component: string
    message: string
    metadata: any
    created_at: string
}

export default function DiagnosticsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [autoRefresh, setAutoRefresh] = useState(true)

    const fetchLogs = async () => {
        try {
            setLoading(true)
            // We'll add a simple API route to fetch logs since we can't query directly from client efficiently without exposure
            const response = await fetch('/api/admin/system-logs')
            if (response.ok) {
                const data = await response.json()
                setLogs(data.logs || [])
            }
        } catch (error) {
            console.error('Failed to fetch logs', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()

        let interval: NodeJS.Timeout
        if (autoRefresh) {
            interval = setInterval(fetchLogs, 5000)
        }
        return () => clearInterval(interval)
    }, [autoRefresh])

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'error': return 'bg-red-100 text-red-800 border-red-200'
            case 'warn': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'info': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'debug': return 'bg-gray-100 text-gray-800 border-gray-200'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Forensics</h1>
                    <p className="text-muted-foreground mt-2">
                        Real-time telemetry from webhooks and background services.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={autoRefresh ? 'bg-green-50 text-green-700 border-green-200' : ''}
                    >
                        {autoRefresh ? 'Live Updates On' : 'Live Updates Off'}
                    </Button>
                    <Button onClick={() => fetchLogs()} disabled={loading && !autoRefresh}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Now
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Event Log</CardTitle>
                        <CardDescription>
                            Showing last 50 system events. Inspect "metadata" for payload details.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {logs.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No logs recorded yet. Waiting for events...
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                                        <tr>
                                            <th className="p-4 w-40">Timestamp</th>
                                            <th className="p-4 w-24">Level</th>
                                            <th className="p-4 w-48">Component</th>
                                            <th className="p-4">Message & Metadata</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50/50">
                                                <td className="p-4 font-mono text-xs text-gray-500 whitespace-nowrap">
                                                    {new Date(log.created_at).toLocaleTimeString()}
                                                    <br />
                                                    <span className="opacity-50">{new Date(log.created_at).toLocaleDateString()}</span>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="outline" className={getLevelColor(log.level)}>
                                                        {log.level.toUpperCase()}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 font-medium text-gray-900">
                                                    {log.component}
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-medium text-gray-900 mb-1">{log.message}</div>
                                                    {Object.keys(log.metadata).length > 0 && (
                                                        <pre className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono overflow-auto border max-h-40">
                                                            {JSON.stringify(log.metadata, null, 2)}
                                                        </pre>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
