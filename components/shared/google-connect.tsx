'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Calendar, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'

interface GoogleIntegrationState {
    connected: boolean
    email?: string
    scopes?: string[]
    expiresAt?: string
    loading: boolean
    error?: string
}

export function GoogleConnect() {
    const [state, setState] = useState<GoogleIntegrationState>({
        connected: false,
        loading: true,
    })

    useEffect(() => {
        checkGoogleConnection()
    }, [])

    const checkGoogleConnection = async () => {
        try {
            const response = await fetch('/api/integrations/google/status')
            if (response.ok) {
                const data = await response.json()
                setState({
                    connected: data.connected,
                    email: data.email,
                    scopes: data.scopes,
                    expiresAt: data.expires_at,
                    loading: false,
                })
            } else {
                setState({ connected: false, loading: false })
            }
        } catch (error) {
            setState({ connected: false, loading: false })
        }
    }

    const handleConnect = async () => {
        setState(prev => ({ ...prev, loading: true, error: undefined }))
        try {
            const response = await fetch('/api/auth/google')
            if (response.ok) {
                const data = await response.json()
                if (data.auth_url) {
                    window.location.href = data.auth_url
                }
            } else {
                const error = await response.json()
                setState(prev => ({ ...prev, loading: false, error: error.message }))
            }
        } catch (error) {
            setState(prev => ({ ...prev, loading: false, error: 'Failed to initiate connection' }))
        }
    }

    const handleDisconnect = async () => {
        setState(prev => ({ ...prev, loading: true }))
        try {
            // Get CSRF token from client cookie
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf-token-client='))
                ?.split('=')[1] || ''

            const response = await fetch('/api/integrations/google/disconnect', {
                method: 'POST',
                headers: {
                    'x-csrf-token': csrfToken,
                },
            })
            if (response.ok) {
                setState({ connected: false, loading: false })
            } else {
                setState(prev => ({ ...prev, loading: false, error: 'Failed to disconnect' }))
            }
        } catch (error) {
            setState(prev => ({ ...prev, loading: false, error: 'Failed to disconnect' }))
        }
    }

    if (state.loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Checking Google connection...</span>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={state.connected ? 'border-green-200 bg-green-50/30' : ''}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xl">G</span>
                        </div>
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                Google Integration
                                {state.connected && (
                                    <Badge className="bg-green-100 text-green-800">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Connected
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Connect Gmail and Calendar for automatic CRM updates
                            </CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {state.error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{state.error}</AlertDescription>
                    </Alert>
                )}

                {state.connected ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-green-600" />
                                <span>Gmail synced</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-green-600" />
                                <span>Calendar events monitored</span>
                            </div>
                        </div>

                        {state.email && (
                            <p className="text-sm text-gray-600">
                                Connected as: <strong>{state.email}</strong>
                            </p>
                        )}

                        <div className="bg-white/50 p-4 rounded-lg space-y-2">
                            <h4 className="font-medium text-sm">Active Features</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• New emails automatically create client records</li>
                                <li>• Tasks extracted via AI from email content</li>
                                <li>• Closing events auto-detected from calendar</li>
                                <li>• Preparation tasks created before closings</li>
                            </ul>
                        </div>

                        <Button variant="destructive" onClick={handleDisconnect} disabled={state.loading}>
                            {state.loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Disconnect Google
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="border rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Mail className="h-5 w-5 text-blue-600" />
                                    <h4 className="font-medium">Gmail Sync</h4>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Automatically process incoming emails to extract client data and create follow-up tasks.
                                </p>
                            </div>
                            <div className="border rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-5 w-5 text-green-600" />
                                    <h4 className="font-medium">Calendar Watch</h4>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Detect closing and settlement events to automatically prepare tasks.
                                </p>
                            </div>
                        </div>

                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Connecting will request read-only access to Gmail and Calendar. Your data stays secure.
                            </AlertDescription>
                        </Alert>

                        <Button onClick={handleConnect} disabled={state.loading} className="w-full">
                            {state.loading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <ExternalLink className="h-4 w-4 mr-2" />
                            )}
                            Connect Google Account
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
