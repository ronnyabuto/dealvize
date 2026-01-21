import { NextRequest, NextResponse } from 'next/server'
import { checkIdempotency } from '@/lib/redis-utils'
import { extractFromMessage } from '@/lib/openrouter'
import { createClient } from '@/lib/supabase/server'

interface WhatsAppMessage {
    id: string
    from: string
    timestamp: string
    type: string
    text?: { body: string }
}

interface WhatsAppWebhookPayload {
    object: string
    entry: Array<{
        id: string
        changes: Array<{
            field: string
            value: {
                messaging_product: string
                metadata: { display_phone_number: string; phone_number_id: string }
                contacts?: Array<{ profile: { name: string }; wa_id: string }>
                messages?: WhatsAppMessage[]
            }
        }>
    }>
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return new NextResponse(challenge, { status: 200 })
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(request: NextRequest) {
    try {
        const payload: WhatsAppWebhookPayload = await request.json()

        if (payload.object !== 'whatsapp_business_account') {
            return NextResponse.json({ status: 'ignored' }, { status: 200 })
        }

        for (const entry of payload.entry) {
            for (const change of entry.changes) {
                if (change.field !== 'messages' || !change.value.messages) continue

                for (const message of change.value.messages) {
                    const idempotencyResult = await checkIdempotency(`whatsapp:${message.id}`, 604800)
                    if (idempotencyResult === 'DUPLICATE') continue

                    if (message.type !== 'text' || !message.text?.body) continue

                    const contact = change.value.contacts?.find(c => c.wa_id === message.from)
                    const senderName = contact?.profile?.name || 'Unknown'
                    const senderPhone = message.from

                    const extraction = await extractFromMessage(message.text.body)

                    if (extraction.data.action_required && extraction.data.task) {
                        const supabase = await createClient()
                        const { data: client } = await supabase
                            .from('clients')
                            .select('id')
                            .eq('phone', senderPhone)
                            .single()

                        if (client) {
                            await supabase.from('tasks').insert({
                                title: extraction.data.task.description,
                                priority: extraction.data.task.priority,
                                status: 'pending',
                                type: 'follow_up',
                                client_id: client.id,
                            })
                        }
                    }
                }
            }
        }

        return NextResponse.json({ status: 'processed' }, { status: 200 })
    } catch (error) {
        console.error('WhatsApp webhook error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
