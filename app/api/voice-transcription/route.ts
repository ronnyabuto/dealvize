import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      call_log_id,
      client_id,
      deal_id,
      audio_file_url,
      audio_duration,
      transcription_provider = 'openai', // 'openai', 'assembly', 'aws', 'google'
      language = 'en'
    } = body

    // Validate required fields
    if (!audio_file_url) {
      return NextResponse.json({
        error: 'Audio file URL is required'
      }, { status: 400 })
    }

    // Start transcription process
    const transcriptionResult = await processVoiceTranscription({
      audio_file_url,
      provider: transcription_provider,
      language,
      user_id: user.id
    })

    // Create transcription record
    const { data: transcription, error } = await supabase
      .from('voice_transcriptions')
      .insert({
        user_id: user.id,
        call_log_id: call_log_id || null,
        client_id: client_id || null,
        deal_id: deal_id || null,
        audio_file_url,
        audio_duration: audio_duration || null,
        transcription_provider,
        language,
        status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (transcriptionResult.success) {
      // Update with results
      await supabase
        .from('voice_transcriptions')
        .update({
          status: 'completed',
          transcribed_text: transcriptionResult.text,
          confidence_score: transcriptionResult.confidence,
          word_count: transcriptionResult.word_count,
          keywords: transcriptionResult.keywords,
          sentiment: transcriptionResult.sentiment,
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', transcription.id)

      // Create automated note if associated with call/client
      if (call_log_id || client_id) {
        await createAutomatedNote(supabase, {
          user_id: user.id,
          client_id,
          call_log_id,
          deal_id,
          transcription_id: transcription.id,
          transcribed_text: transcriptionResult.text,
          keywords: transcriptionResult.keywords,
          sentiment: transcriptionResult.sentiment
        })
      }

      // Record activity
      if (client_id) {
        await supabase
          .from('lead_activities')
          .insert({
            user_id: user.id,
            client_id,
            activity_type: 'call_transcription_completed',
            activity_data: {
              transcription_id: transcription.id,
              word_count: transcriptionResult.word_count,
              sentiment: transcriptionResult.sentiment,
              confidence_score: transcriptionResult.confidence
            },
            score_awarded: 5,
            source: 'voice_transcription'
          })
      }
    }

    return NextResponse.json({
      transcription: {
        ...transcription,
        ...(transcriptionResult.success && {
          transcribed_text: transcriptionResult.text,
          confidence_score: transcriptionResult.confidence,
          status: 'completed'
        })
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error processing voice transcription:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const transcription_id = searchParams.get('id')
    const call_log_id = searchParams.get('call_log_id')
    const client_id = searchParams.get('client_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('voice_transcriptions')
      .select(`
        *,
        call_log:call_logs(id, phone_number, call_start_time, outcome),
        client:clients(id, first_name, last_name, email, phone),
        deal:deals(id, title, status, value)
      `)
      .eq('user_id', user.id)
      .order('processing_started_at', { ascending: false })

    if (transcription_id) {
      query = query.eq('id', transcription_id).single()
    } else {
      if (call_log_id) query = query.eq('call_log_id', call_log_id)
      if (client_id) query = query.eq('client_id', client_id)
      if (status) query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      [transcription_id ? 'transcription' : 'transcriptions']: data
    })
  } catch (error) {
    console.error('Error fetching transcriptions:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

// Voice transcription processing function
async function processVoiceTranscription(options: {
  audio_file_url: string
  provider: string
  language: string
  user_id: string
}): Promise<{
  success: boolean
  text?: string
  confidence?: number
  word_count?: number
  keywords?: string[]
  sentiment?: any
  error?: string
}> {
  const { audio_file_url, provider, language } = options

  try {
    // In production, integrate with actual transcription services
    switch (provider) {
      case 'openai':
        return await processOpenAITranscription(audio_file_url, language)
      case 'assembly':
        return await processAssemblyAITranscription(audio_file_url, language)
      case 'aws':
        return await processAWSTranscription(audio_file_url, language)
      case 'google':
        return await processGoogleTranscription(audio_file_url, language)
      default:
        return await mockTranscriptionResponse(audio_file_url)
    }
  } catch (error) {
    console.error('Transcription processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transcription failed'
    }
  }
}

// Mock transcription for development
async function mockTranscriptionResponse(audio_file_url: string) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000))

  const mockTranscriptions = [
    {
      text: "Hi John, thanks for taking the time to speak with me today about the property on Main Street. I understand you're looking for a three-bedroom home in the downtown area with a budget of around $450,000. Based on our conversation, I think this property would be a great fit for your family. The location is excellent with good schools nearby and easy access to public transportation. I'd love to schedule a showing for this weekend if you're available. What works better for you - Saturday morning or Sunday afternoon?",
      keywords: ["property", "Main Street", "three-bedroom", "downtown", "$450,000", "schools", "transportation", "showing", "weekend"],
      sentiment: { score: 0.8, label: 'positive' }
    },
    {
      text: "Thanks for calling back about the listing consultation. I've reviewed the comparable properties in your neighborhood and I believe we can list your home at $325,000. The market is quite strong right now with homes selling within 30-45 days on average. I'd recommend doing some minor staging improvements - perhaps fresh paint in the living room and some landscaping touch-ups. These small investments could increase the sale price by $10,000 to $15,000. When would be a good time for me to come by and do a complete market analysis?",
      keywords: ["listing", "consultation", "$325,000", "30-45 days", "staging", "paint", "landscaping", "$10,000", "market analysis"],
      sentiment: { score: 0.7, label: 'positive' }
    },
    {
      text: "I wanted to follow up on your interest in the downtown condo. Unfortunately, the seller has decided to accept another offer. However, I have three other properties that match your criteria perfectly. There's a beautiful two-bedroom unit in the Riverside complex that just came on the market yesterday. It's priced at $280,000 and has all the amenities you mentioned - gym, pool, and parking. Would you like me to send you the details and schedule a viewing?",
      keywords: ["downtown condo", "another offer", "two-bedroom", "Riverside complex", "$280,000", "gym", "pool", "parking", "viewing"],
      sentiment: { score: 0.6, label: 'neutral' }
    }
  ]

  const randomTranscription = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)]
  
  return {
    success: true,
    text: randomTranscription.text,
    confidence: 0.85 + Math.random() * 0.14, // 85-99% confidence
    word_count: randomTranscription.text.split(' ').length,
    keywords: randomTranscription.keywords,
    sentiment: randomTranscription.sentiment
  }
}

async function processOpenAITranscription(audio_file_url: string, language: string) {
  // Integration with OpenAI Whisper API
  console.log('Processing with OpenAI Whisper:', { audio_file_url, language })
  return mockTranscriptionResponse(audio_file_url)
}

async function processAssemblyAITranscription(audio_file_url: string, language: string) {
  // Integration with AssemblyAI
  console.log('Processing with AssemblyAI:', { audio_file_url, language })
  return mockTranscriptionResponse(audio_file_url)
}

async function processAWSTranscription(audio_file_url: string, language: string) {
  // Integration with AWS Transcribe
  console.log('Processing with AWS Transcribe:', { audio_file_url, language })
  return mockTranscriptionResponse(audio_file_url)
}

async function processGoogleTranscription(audio_file_url: string, language: string) {
  // Integration with Google Speech-to-Text
  console.log('Processing with Google Speech-to-Text:', { audio_file_url, language })
  return mockTranscriptionResponse(audio_file_url)
}

// Create automated note from transcription
async function createAutomatedNote(supabase: any, data: {
  user_id: string
  client_id?: string
  call_log_id?: string
  deal_id?: string
  transcription_id: string
  transcribed_text: string
  keywords?: string[]
  sentiment?: any
}) {
  const {
    user_id,
    client_id,
    call_log_id,
    deal_id,
    transcription_id,
    transcribed_text,
    keywords,
    sentiment
  } = data

  // Generate summary for the note
  const summary = generateCallSummary(transcribed_text, keywords, sentiment)
  
  const noteContent = `**Call Transcription Summary**

${summary}

**Key Topics:** ${keywords?.join(', ') || 'None identified'}

**Sentiment:** ${sentiment?.label || 'Unknown'} (${sentiment?.score ? Math.round(sentiment.score * 100) : 0}% confidence)

**Full Transcription:**
${transcribed_text}

---
*Generated automatically from voice transcription*`

  const { data: note, error } = await supabase
    .from('notes')
    .insert({
      user_id,
      client_id: client_id || null,
      deal_id: deal_id || null,
      content: noteContent,
      note_type: 'call_transcription',
      metadata: {
        transcription_id,
        call_log_id,
        word_count: transcribed_text.split(' ').length,
        sentiment: sentiment,
        keywords: keywords,
        auto_generated: true
      }
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating automated note:', error)
  }

  return note
}

// Generate call summary from transcription
function generateCallSummary(text: string, keywords?: string[], sentiment?: any): string {
  const words = text.split(' ')
  const sentences = text.split(/[.!?]+/)
  
  const importantSentences = []
  
  // Always include first sentence
  if (sentences[0]) {
    importantSentences.push(sentences[0].trim())
  }
  
  // Include sentences with key terms
  const keyTerms = ['price', 'budget', 'property', 'house', 'home', 'listing', 'offer', 'showing', 'meeting']
  sentences.forEach(sentence => {
    if (keyTerms.some(term => sentence.toLowerCase().includes(term)) && 
        !importantSentences.includes(sentence.trim())) {
      importantSentences.push(sentence.trim())
    }
  })
  
  // Include last sentence if it's different from first
  const lastSentence = sentences[sentences.length - 1]?.trim()
  if (lastSentence && lastSentence !== importantSentences[0] && importantSentences.length < 3) {
    importantSentences.push(lastSentence)
  }
  
  let summary = importantSentences.slice(0, 3).join('. ')
  
  // Add context based on sentiment and keywords
  if (sentiment?.label === 'positive') {
    summary += ' The conversation had a positive tone.'
  } else if (sentiment?.label === 'negative') {
    summary += ' The conversation indicated some concerns or objections.'
  }
  
  return summary
}