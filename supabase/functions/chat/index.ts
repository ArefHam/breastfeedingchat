import { createClient } from 'npm:@supabase/supabase-js@2.110.3'
import { z } from 'npm:zod@4.4.3'
import { bearerToken, corsHeaders, jsonResponse } from '../_shared/http.ts'
import { supabaseEnvironment } from '../_shared/supabase-env.ts'

const requestSchema = z.object({
  conversationId: z.uuid().nullable().optional(),
  requestId: z.uuid(),
  message: z.string().trim().min(1).max(4000),
  language: z.enum(['fa', 'en']),
})

const n8nResponseSchema = z.object({ answer: z.string().trim().min(1).max(20000) })

interface BeginResult {
  duplicate: boolean
  in_progress: boolean
  conversation: Record<string, unknown>
  user_message_id: string
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })
  if (request.method !== 'POST') return jsonResponse(request, { error: 'method_not_allowed' }, 405)

  const token = bearerToken(request)
  if (!token) return jsonResponse(request, { error: 'unauthorized', message: 'Sign in is required.' }, 401)

  const { url: supabaseUrl, publishableKey, secretKey } = supabaseEnvironment()
  const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')
  const n8nWebhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET')
  if (!supabaseUrl || !publishableKey || !secretKey || !n8nWebhookUrl || !n8nWebhookSecret) {
    return jsonResponse(request, { error: 'service_unavailable', message: 'Chat service is not configured.' }, 503)
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) return jsonResponse(request, { error: 'unauthorized', message: 'Your session has expired.' }, 401)

  let payload: z.infer<typeof requestSchema>
  try {
    payload = requestSchema.parse(await request.json())
  } catch {
    return jsonResponse(request, { error: 'validation_error', message: 'The message request is invalid.' }, 400)
  }

  const { data: beginData, error: beginError } = await admin.rpc('begin_chat_request', {
    p_user_id: userData.user.id,
    p_conversation_id: payload.conversationId ?? null,
    p_request_id: payload.requestId,
    p_message: payload.message,
    p_language: payload.language,
  })

  if (beginError) {
    const message = beginError.message ?? ''
    if (message.includes('rate_limit_exceeded')) {
      return jsonResponse(request, { error: 'rate_limit_exceeded', message: 'Wait before sending another message.' }, 429)
    }
    if (message.includes('conversation_not_found')) {
      return jsonResponse(request, { error: 'not_found', message: 'Conversation not found.' }, 404)
    }
    return jsonResponse(request, { error: 'validation_error', message: 'The chat request could not be accepted.' }, 400)
  }

  const begin = beginData as unknown as BeginResult
  const conversationId = String(begin.conversation.id)

  if (begin.in_progress) {
    return jsonResponse(request, { error: 'request_in_progress', message: 'This message is already being processed.', conversationId }, 409)
  }

  if (begin.duplicate) {
    const { data: existingAssistant } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('request_id', payload.requestId)
      .eq('role', 'assistant')
      .maybeSingle()
    if (existingAssistant) {
      const { data: existingUser } = await supabase
        .from('messages')
        .select('*')
        .eq('id', begin.user_message_id)
        .single()
      return jsonResponse(request, {
        conversation: begin.conversation,
        userMessage: existingUser,
        assistantMessage: existingAssistant,
      })
    }
  }

  const { data: priorMessages, error: historyError } = await supabase
    .from('messages')
    .select('role, content, sequence')
    .eq('conversation_id', conversationId)
    .neq('request_id', payload.requestId)
    .eq('status', 'completed')
    .order('sequence', { ascending: false })
    .limit(12)

  if (historyError) {
    await admin.rpc('fail_chat_request', { p_user_id: userData.user.id, p_conversation_id: conversationId, p_request_id: payload.requestId })
    return jsonResponse(request, { error: 'internal_error', message: 'Conversation history could not be loaded.', conversationId }, 500)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55_000)

  try {
    const upstream = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Chat-Secret': n8nWebhookSecret,
      },
      body: JSON.stringify({
        msg: payload.message,
        sessionId: conversationId,
        requestId: payload.requestId,
        lang: payload.language,
        history: (priorMessages ?? []).reverse().map(({ role, content }) => ({ role, content })),
      }),
      signal: controller.signal,
    })

    if (!upstream.ok) throw new Error(`upstream_${upstream.status}`)
    const parsed = n8nResponseSchema.safeParse(await upstream.json())
    if (!parsed.success) throw new Error('invalid_upstream_response')

    const { error: completeError } = await admin.rpc('complete_chat_request', {
      p_user_id: userData.user.id,
      p_conversation_id: conversationId,
      p_request_id: payload.requestId,
      p_answer: parsed.data.answer,
    })
    if (completeError) throw new Error('persistence_failed')

    const [{ data: conversation }, { data: userMessage }, { data: assistantMessage }] = await Promise.all([
      supabase.from('conversations').select('*').eq('id', conversationId).single(),
      supabase.from('messages').select('*').eq('id', begin.user_message_id).single(),
      supabase.from('messages').select('*').eq('conversation_id', conversationId).eq('request_id', payload.requestId).eq('role', 'assistant').single(),
    ])

    return jsonResponse(request, { conversation, userMessage, assistantMessage })
  } catch (error) {
    await admin.rpc('fail_chat_request', { p_user_id: userData.user.id, p_conversation_id: conversationId, p_request_id: payload.requestId })
    const timeoutError = error instanceof DOMException && error.name === 'AbortError'
    return jsonResponse(
      request,
      { error: timeoutError ? 'upstream_timeout' : 'upstream_error', message: 'The assistant is temporarily unavailable.', conversationId },
      timeoutError ? 504 : 502,
    )
  } finally {
    clearTimeout(timeout)
  }
})
