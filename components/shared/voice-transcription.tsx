"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Mic, Upload, Play, Pause, Download, Copy, CheckCircle, AlertCircle, Clock, MessageSquare, Phone, User, Calendar } from "lucide-react"
import { toast } from "sonner"

interface VoiceTranscription {
  id: string
  audio_file_url: string
  audio_duration?: number
  transcription_provider: string
  language: string
  status: 'processing' | 'completed' | 'failed'
  transcribed_text?: string
  confidence_score?: number
  word_count?: number
  keywords?: string[]
  sentiment?: {
    score: number
    label: string
  }
  processing_started_at: string
  processing_completed_at?: string
  call_log?: {
    id: string
    phone_number: string
    call_start_time: string
    outcome: string
  }
  client?: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
  }
  deal?: {
    id: string
    title: string
    status: string
    value: number
  }
}

interface VoiceTranscriptionProps {
  clientId?: string
  dealId?: string
  callLogId?: string
}

export function VoiceTranscription({ clientId, dealId, callLogId }: VoiceTranscriptionProps) {
  const [transcriptions, setTranscriptions] = useState<VoiceTranscription[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [provider, setProvider] = useState('openai')
  const [language, setLanguage] = useState('en')
  const [processingTranscription, setProcessingTranscription] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editedText, setEditedText] = useState('')

  useEffect(() => {
    fetchTranscriptions()
  }, [clientId, dealId, callLogId])

  const fetchTranscriptions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (clientId) params.append('client_id', clientId)
      if (dealId) params.append('deal_id', dealId)
      if (callLogId) params.append('call_log_id', callLogId)

      const response = await fetch(`/api/voice-transcription?${params}`)
      if (!response.ok) throw new Error('Failed to fetch transcriptions')
      
      const data = await response.json()
      setTranscriptions(data.transcriptions || [])
    } catch (error) {
      console.error('Error fetching transcriptions:', error)
      toast.error('Failed to load transcriptions')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file')
      return
    }

    setSelectedFile(file)
    
    // Create temporary URL for preview
    const url = URL.createObjectURL(file)
    setAudioUrl(url)
  }

  const handleTranscription = async () => {
    if (!selectedFile && !audioUrl) {
      toast.error('Please upload an audio file or provide a URL')
      return
    }

    setUploading(true)
    try {
      let fileUrl = audioUrl

      if (selectedFile) {
        // In production, upload to storage service and get URL
        fileUrl = URL.createObjectURL(selectedFile)
      }

      const response = await fetch('/api/voice-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_file_url: fileUrl,
          audio_duration: selectedFile ? selectedFile.size / 1000 : undefined, // Rough estimate
          transcription_provider: provider,
          language,
          client_id: clientId,
          deal_id: dealId,
          call_log_id: callLogId
        })
      })

      if (!response.ok) throw new Error('Failed to start transcription')

      const data = await response.json()
      setProcessingTranscription(data.transcription.id)
      
      toast.success('Transcription started successfully')
      
      // Reset form
      setSelectedFile(null)
      setAudioUrl('')
      
      // Refresh transcriptions
      await fetchTranscriptions()
      
      // Poll for completion
      pollTranscriptionStatus(data.transcription.id)
    } catch (error) {
      console.error('Error starting transcription:', error)
      toast.error('Failed to start transcription')
    } finally {
      setUploading(false)
    }
  }

  const pollTranscriptionStatus = async (transcriptionId: string) => {
    const maxAttempts = 30
    let attempts = 0

    const poll = async () => {
      attempts++
      try {
        const response = await fetch(`/api/voice-transcription?id=${transcriptionId}`)
        if (!response.ok) return

        const data = await response.json()
        const transcription = data.transcription

        if (transcription.status === 'completed') {
          setProcessingTranscription(null)
          await fetchTranscriptions()
          toast.success('Transcription completed successfully')
          return
        }

        if (transcription.status === 'failed') {
          setProcessingTranscription(null)
          toast.error('Transcription failed')
          return
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 2000)
        } else {
          setProcessingTranscription(null)
          toast.error('Transcription timed out')
        }
      } catch (error) {
        console.error('Error polling transcription:', error)
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000)
        }
      }
    }

    poll()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const downloadTranscription = (transcription: VoiceTranscription) => {
    if (!transcription.transcribed_text) return

    const content = `Transcription Report
Generated: ${new Date().toLocaleDateString()}

Client: ${transcription.client ? `${transcription.client.first_name} ${transcription.client.last_name}` : 'N/A'}
Phone: ${transcription.client?.phone || 'N/A'}
Call Time: ${transcription.call_log ? new Date(transcription.call_log.call_start_time).toLocaleString() : 'N/A'}

Provider: ${transcription.transcription_provider}
Language: ${transcription.language}
Confidence: ${transcription.confidence_score ? Math.round(transcription.confidence_score * 100) : 0}%
Word Count: ${transcription.word_count || 0}

Keywords: ${transcription.keywords?.join(', ') || 'None'}
Sentiment: ${transcription.sentiment?.label || 'Unknown'} (${transcription.sentiment?.score ? Math.round(transcription.sentiment.score * 100) : 0}% confidence)

Full Transcription:
${transcription.transcribed_text}
`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcription-${transcription.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getSentimentColor = (sentiment?: { label: string, score: number }) => {
    if (!sentiment) return 'secondary'
    
    switch (sentiment.label) {
      case 'positive': return 'success'
      case 'negative': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Transcription
          </CardTitle>
          <CardDescription>
            Upload audio files and convert them to text with AI-powered transcription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList>
              <TabsTrigger value="upload">Upload Audio</TabsTrigger>
              <TabsTrigger value="history">Transcription History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="audio-file">Audio File</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="audio-file"
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-muted file:text-muted-foreground"
                    />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audio-url">Or Audio URL</Label>
                  <Input
                    id="audio-url"
                    placeholder="https://example.com/audio.mp3"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Transcription Provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI Whisper</SelectItem>
                      <SelectItem value="assembly">AssemblyAI</SelectItem>
                      <SelectItem value="aws">AWS Transcribe</SelectItem>
                      <SelectItem value="google">Google Speech-to-Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="it">Italian</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(selectedFile || audioUrl) && (
                <div className="space-y-2">
                  <Label>Audio Preview</Label>
                  <audio controls className="w-full">
                    <source src={audioUrl || (selectedFile ? URL.createObjectURL(selectedFile) : '')} />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              <Button 
                onClick={handleTranscription} 
                disabled={(!selectedFile && !audioUrl) || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Start Transcription
                  </>
                )}
              </Button>

              {processingTranscription && (
                <Alert>
                  <Clock className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Transcription is processing. This may take a few minutes depending on the audio length.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="h-6 w-6 animate-spin mr-2" />
                  Loading transcriptions...
                </div>
              ) : transcriptions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No transcriptions found</p>
                  <p className="text-sm text-muted-foreground">Upload an audio file to get started</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {transcriptions.map((transcription) => (
                      <Card key={transcription.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(transcription.status)}
                                <span className="font-medium">
                                  {transcription.status === 'completed' ? 'Transcription Complete' : 
                                   transcription.status === 'processing' ? 'Processing...' : 'Failed'}
                                </span>
                                <Badge variant="outline">
                                  {transcription.transcription_provider}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(transcription.processing_started_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {transcription.status === 'completed' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(transcription.transcribed_text || '')}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => downloadTranscription(transcription)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {(transcription.client || transcription.call_log) && (
                            <div className="flex items-center gap-4 text-sm">
                              {transcription.client && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {transcription.client.first_name} {transcription.client.last_name}
                                </div>
                              )}
                              {transcription.call_log && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {transcription.call_log.phone_number}
                                </div>
                              )}
                              {transcription.call_log && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(transcription.call_log.call_start_time).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          )}
                        </CardHeader>

                        {transcription.status === 'completed' && transcription.transcribed_text && (
                          <CardContent className="pt-0">
                            <div className="space-y-4">
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Confidence:</span>
                                  <Badge variant="secondary">
                                    {Math.round((transcription.confidence_score || 0) * 100)}%
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Words:</span>
                                  <Badge variant="secondary">{transcription.word_count || 0}</Badge>
                                </div>
                                {transcription.sentiment && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Sentiment:</span>
                                    <Badge variant={getSentimentColor(transcription.sentiment) as any}>
                                      {transcription.sentiment.label} ({Math.round(transcription.sentiment.score * 100)}%)
                                    </Badge>
                                  </div>
                                )}
                              </div>

                              {transcription.keywords && transcription.keywords.length > 0 && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Keywords:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {transcription.keywords.map((keyword, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <Separator />

                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Transcription:</p>
                                <div className="bg-muted p-3 rounded-md">
                                  <p className="text-sm whitespace-pre-wrap">{transcription.transcribed_text}</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        )}

                        {transcription.status === 'processing' && (
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              <Progress value={undefined} className="w-full" />
                              <p className="text-sm text-muted-foreground text-center">
                                Processing transcription...
                              </p>
                            </div>
                          </CardContent>
                        )}

                        {transcription.status === 'failed' && (
                          <CardContent className="pt-0">
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Transcription failed. Please try again with a different audio file or provider.
                              </AlertDescription>
                            </Alert>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}