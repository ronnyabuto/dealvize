import { NextRequest, NextResponse } from 'next/server'
import { checkIdempotency } from '@/lib/redis-utils'
import { getHistoryChanges, getMessage, parseEmailContent } from '@/lib/google'
import { extractFromEmail } from '@/lib/openrouter'
import { createServiceClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

interface PubSubMessage {
    message: {
        data: string
        messageId: string
        publishTime: string
    }
    subscription: string
}

interface GmailNotification {
    emailAddress: string
    historyId: number
}

export async function POST(request: NextRequest) {
    try {
        const body: PubSubMessage = await request.json()
        await logger.info('gmail_webhook', 'Received Pub/Sub notification', { messageId: body.message.messageId })

        const idempotencyResult = await checkIdempotency(`gmail:${body.message.messageId}`, 86400)
        if (idempotencyResult === 'DUPLICATE') {
            await logger.debug('gmail_webhook', 'Duplicate message ignored', { messageId: body.message.messageId })
            return NextResponse.json({ status: 'duplicate' }, { status: 200 })
        }

        const data = Buffer.from(body.message.data, 'base64').toString('utf-8')
        const notification: GmailNotification = JSON.parse(data)
        await logger.info('gmail_webhook', 'Processing notification for email', { email: notification.emailAddress, historyId: notification.historyId })

        const supabase = createServiceClient()

        // Look up integration by the email address from the Gmail notification
        const { data: integration } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('provider', 'google')
            .filter('metadata->>email', 'eq', notification.emailAddress)
            .single()

        if (!integration?.access_token) {
            await logger.warn('gmail_webhook', 'No integration found for email', { email: notification.emailAddress })
            return NextResponse.json({ status: 'no_integration', email: notification.emailAddress }, { status: 200 })
        }

        await logger.info('gmail_webhook', 'Found integration', { userId: integration.user_id })

        const { data: syncState } = await supabase
            .from('sync_states')
            .select('history_id')
            .eq('user_id', integration.user_id)
            .eq('provider', 'gmail')
            .single()

        const startHistoryId = syncState?.history_id || String(notification.historyId - 1)

        const historyChanges = await getHistoryChanges(
            integration.access_token,
            integration.refresh_token,
            startHistoryId
        )

        await logger.info('gmail_webhook', 'Fetched history changes', { count: historyChanges.length })

        for (const history of historyChanges) {
            if (!history.messagesAdded) continue

            for (const added of history.messagesAdded) {
                if (!added.message?.id) continue

                const messageIdempotency = await checkIdempotency(`msg:${added.message.id}`, 604800)
                if (messageIdempotency === 'DUPLICATE') continue

                const fullMessage = await getMessage(
                    integration.access_token,
                    integration.refresh_token,
                    added.message.id
                )

                const emailContent = parseEmailContent(fullMessage)
                await logger.info('gmail_webhook', 'Parsed email content', {
                    subject: emailContent.subject,
                    from: emailContent.from
                })

                const emailText = `Subject: ${emailContent.subject}\nFrom: ${emailContent.from}\n\n${emailContent.body}`
                const extraction = await extractFromEmail(emailText)

                await logger.info('gmail_webhook', 'LLM Extraction Result', {
                    confidence: extraction.data.confidence,
                    client: extraction.data.client,
                    tasks: extraction.data.tasks.length
                })

                if (extraction.data.confidence < 0.5) {
                    await logger.info('gmail_webhook', 'Skipping low confidence email', { confidence: extraction.data.confidence })
                    continue
                }

                const fromMatch = emailContent.from.match(/<([^>]+)>/) || [null, emailContent.from]
                const senderEmail = fromMatch[1] || emailContent.from

                // Get the user_id from the integration for data isolation
                const userId = integration.user_id

                let clientId: string | null = null
                // Look for existing client owned by this user
                const { data: existingClient } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('email', senderEmail)
                    .single()

                if (existingClient) {
                    clientId = existingClient.id
                    await logger.info('gmail_webhook', 'Matched existing client', { clientId })
                } else if (extraction.data.client.name || extraction.data.client.email) {
                    const { data: newClient } = await supabase
                        .from('clients')
                        .insert({
                            user_id: userId,
                            name: extraction.data.client.name || senderEmail.split('@')[0],
                            email: extraction.data.client.email || senderEmail,
                            phone: extraction.data.client.phone,
                            company: extraction.data.client.company,
                            status: 'lead',
                            source: 'gmail_webhook',
                        })
                        .select('id')
                        .single()

                    clientId = newClient?.id || null
                    await logger.info('gmail_webhook', 'Created new client', { clientId })
                }

                for (const task of extraction.data.tasks) {
                    const dueDate = new Date()
                    if (task.due === 'this_week') dueDate.setDate(dueDate.getDate() + 7)
                    else if (task.due === 'next_week') dueDate.setDate(dueDate.getDate() + 14)

                    await supabase.from('tasks').insert({
                        user_id: userId,
                        title: task.description,
                        status: 'pending',
                        priority: 'medium',
                        type: 'follow_up',
                        due_date: dueDate.toISOString(),
                        client_id: clientId,
                    })
                    await logger.info('gmail_webhook', 'Created task', { task: task.description })
                }
            }
        }

        await supabase.from('sync_states').upsert({
            user_id: integration.user_id,
            provider: 'gmail',
            history_id: String(notification.historyId),
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id,provider'
        })

        return NextResponse.json({ status: 'processed' }, { status: 200 })
    } catch (error) {
        // Log error safely even if error object is complex
        const errorMessage = error instanceof Error ? error.message : String(error)
        await logger.error('gmail_webhook', 'CRITICAL_FAILURE', { error: errorMessage })
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
