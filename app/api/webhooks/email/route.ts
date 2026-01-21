import { NextRequest, NextResponse } from 'next/server'
import { checkIdempotency } from '@/lib/redis-utils'
import { extractFromEmail } from '@/lib/openrouter'
import { createClient } from '@/lib/supabase/server'

interface EmailWebhookPayload {
    id: string
    grant_id: string
    object: 'message'
    data: {
        id: string
        thread_id: string
        subject: string
        from: Array<{ name: string; email: string }>
        to: Array<{ name: string; email: string }>
        body: string
        date: number
    }
}

export async function POST(request: NextRequest) {
    try {
        const payload: EmailWebhookPayload = await request.json()

        const idempotencyResult = await checkIdempotency(`email:${payload.data.id}`, 604800)
        if (idempotencyResult === 'DUPLICATE') {
            return NextResponse.json({ status: 'duplicate' }, { status: 200 })
        }

        const sender = payload.data.from[0]
        if (!sender) {
            return NextResponse.json({ status: 'no_sender' }, { status: 200 })
        }

        const emailContent = `
Subject: ${payload.data.subject}
From: ${sender.name} <${sender.email}>

${payload.data.body}
`.trim()

        const extraction = await extractFromEmail(emailContent)

        if (extraction.data.confidence < 0.5) {
            return NextResponse.json({ status: 'low_confidence' }, { status: 200 })
        }

        const supabase = await createClient()

        let clientId: string | null = null
        const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .eq('email', sender.email)
            .single()

        if (existingClient) {
            clientId = existingClient.id
        } else if (extraction.data.client.email || extraction.data.client.name) {
            const { data: newClient } = await supabase
                .from('clients')
                .insert({
                    name: extraction.data.client.name || sender.name,
                    email: extraction.data.client.email || sender.email,
                    phone: extraction.data.client.phone,
                    company: extraction.data.client.company,
                    status: 'lead',
                    source: 'email_webhook',
                })
                .select('id')
                .single()

            clientId = newClient?.id || null
        }

        for (const task of extraction.data.tasks) {
            const dueDate = new Date()
            if (task.due === 'this_week') dueDate.setDate(dueDate.getDate() + 7)
            else if (task.due === 'next_week') dueDate.setDate(dueDate.getDate() + 14)

            await supabase.from('tasks').insert({
                title: task.description,
                status: 'pending',
                priority: 'medium',
                type: 'follow_up',
                due_date: dueDate.toISOString(),
                client_id: clientId,
            })
        }

        return NextResponse.json({
            status: 'processed',
            client_id: clientId,
            tasks_created: extraction.data.tasks.length,
            intent: extraction.data.deal.intent,
        }, { status: 200 })
    } catch (error) {
        console.error('Email webhook error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
