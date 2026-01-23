import { OpenRouter } from '@openrouter/sdk'
import { z } from 'zod'

const openRouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY!,
})

export const EXTRACTION_MODELS = [
    'google/gemini-1.5-pro',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o',
] as const

export const DEFAULT_PROVIDER_CONFIG = {
    sort: {
        by: 'price' as const,
        partition: 'none' as const,
    },
    preferredMinThroughput: { p90: 50 },
    preferredMaxLatency: { p90: 3 },
}

export const ClientExtractionSchema = z.object({
    client: z.object({
        name: z.string().nullable(),
        email: z.string().email().nullable(),
        phone: z.string().nullable(),
        company: z.string().nullable(),
    }),
    deal: z.object({
        property_type: z.enum(['residential', 'commercial']).nullable(),
        budget_min: z.number().nullable(),
        budget_max: z.number().nullable(),
        timeline: z.enum(['immediate', '30_days', '90_days', 'exploratory']).nullable(),
        intent: z.enum(['INQUIRY', 'NEGOTIATION', 'CLOSING', 'FOLLOW_UP']),
    }),
    tasks: z.array(z.object({
        description: z.string(),
        due: z.enum(['today', 'this_week', 'next_week']),
    })),
    confidence: z.number().min(0).max(1),
})

export const MessageUpdateSchema = z.object({
    update_type: z.enum(['SENTIMENT', 'SCHEDULE', 'DECISION', 'QUESTION']),
    action_required: z.boolean(),
    task: z.object({
        description: z.string(),
        priority: z.enum(['high', 'medium', 'low']),
    }).nullable(),
    deal_stage_change: z.string().nullable(),
})

export type ClientExtraction = z.infer<typeof ClientExtractionSchema>
export type MessageUpdate = z.infer<typeof MessageUpdateSchema>

interface ExtractionResult<T> {
    data: T
    model_used: string
    tokens: { input: number; output: number }
    latency_ms: number
}

const EMAIL_EXTRACTION_PROMPT = `You are an expert Real Estate AI Assistant. Your job is to extract high-value CRM data from emails.
Analyze the email thread and extract structured data. Return ONLY valid JSON.

NOISE FILTERING RULES:
- IGNORE spam, newsletters, receipts, and automated system notifications.
- IGNORE personal conversations unrelated to real estate business.
- For irrelevant emails, return "confidence": 0.0 and null fields.

CONFIDENCE SCORING RUBRIC:
- 0.9-1.0: Clear new lead with explicit contact info and property intent.
- 0.7-0.8: Valid business inquiry but missing some details (e.g., no phone number).
- 0.5-0.6: Vague inquiry or existing client update.
- < 0.5: Irrelevant/Spam/Noise (will be filtered out).

EXTRACTION RULES:
- Client: Extract distinct contact details. If it's a couple, use the primary sender.
- Phone: unexpected formats (e.g. +1... or 555-...) should be normalized if possible.
- Intent: Map "looking to buy" -> INQUIRY, "offer" -> NEGOTIATION, "closing date" -> CLOSING.
- Tasks: Be proactive. "Can we see it Tuesday?" -> Task: "Schedule showing for Tuesday".

SCHEMA:
{
  "client": {
    "name": string | null,
    "email": string | null,
    "phone": string | null,
    "company": string | null
  },
  "deal": {
    "property_type": "residential" | "commercial" | null,
    "budget_min": number | null,
    "budget_max": number | null,
    "timeline": "immediate" | "30_days" | "90_days" | "exploratory" | null,
    "intent": "INQUIRY" | "NEGOTIATION" | "CLOSING" | "FOLLOW_UP"
  },
  "tasks": [
    { "description": string, "due": "today" | "this_week" | "next_week" }
  ],
  "confidence": number (0-1)
}`

const MESSAGE_EXTRACTION_PROMPT = `You are a Real Estate Transaction Coordinator AI. Extract CRM updates from this message.
Consider context from previous messages if available.

OBJECTIVE:
Identify actionable updates for a real estate deal.

EXTRACT:
- Sentiment: Is the client getting frustrated or excited?
- Logistics: Schedule changes for showings, inspections, or closings.
- Signals: "We love it", "Too expensive", "Sending offer".
- Questions: Technical questions about property or process.

RETURN:
{
  "update_type": "SENTIMENT" | "SCHEDULE" | "DECISION" | "QUESTION",
  "action_required": boolean,
  "task": { "description": string, "priority": "high" | "medium" | "low" } | null,
  "deal_stage_change": string | null
}`

export async function extractFromEmail(
    emailContent: string
): Promise<ExtractionResult<ClientExtraction>> {
    const start = Date.now()

    const completion = await openRouter.chat.send({
        models: [...EXTRACTION_MODELS],
        messages: [
            { role: 'system', content: EMAIL_EXTRACTION_PROMPT },
            { role: 'user', content: emailContent },
        ],
        provider: DEFAULT_PROVIDER_CONFIG,
        responseFormat: { type: 'json_object' },
    })

    const message = completion.choices[0]?.message
    const content = typeof message?.content === 'string' ? message.content : '{}'
    const parsed = JSON.parse(content)
    const validated = ClientExtractionSchema.parse(parsed)

    return {
        data: validated,
        model_used: completion.model || 'unknown',
        tokens: {
            input: completion.usage?.promptTokens || 0,
            output: completion.usage?.completionTokens || 0,
        },
        latency_ms: Date.now() - start,
    }
}

export async function extractFromMessage(
    messageContent: string,
    context?: string
): Promise<ExtractionResult<MessageUpdate>> {
    const start = Date.now()

    const userContent = context
        ? `Previous context:\n${context}\n\nNew message:\n${messageContent}`
        : messageContent

    const completion = await openRouter.chat.send({
        models: [...EXTRACTION_MODELS],
        messages: [
            { role: 'system', content: MESSAGE_EXTRACTION_PROMPT },
            { role: 'user', content: userContent },
        ],
        provider: DEFAULT_PROVIDER_CONFIG,
        responseFormat: { type: 'json_object' },
    })

    const message = completion.choices[0]?.message
    const content = typeof message?.content === 'string' ? message.content : '{}'
    const parsed = JSON.parse(content)
    const validated = MessageUpdateSchema.parse(parsed)

    return {
        data: validated,
        model_used: completion.model || 'unknown',
        tokens: {
            input: completion.usage?.promptTokens || 0,
            output: completion.usage?.completionTokens || 0,
        },
        latency_ms: Date.now() - start,
    }
}

export { openRouter }
