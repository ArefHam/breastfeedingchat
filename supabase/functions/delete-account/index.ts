import { createClient } from 'npm:@supabase/supabase-js@2.110.3'
import { z } from 'npm:zod@4.4.3'
import { bearerToken, corsHeaders, jsonResponse } from '../_shared/http.ts'
import { supabaseEnvironment } from '../_shared/supabase-env.ts'

const requestSchema = z.object({ confirmation: z.string().trim().email().max(254) })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })
  if (request.method !== 'POST') return jsonResponse(request, { error: 'method_not_allowed' }, 405)

  const token = bearerToken(request)
  if (!token) return jsonResponse(request, { error: 'unauthorized' }, 401)

  const { url: supabaseUrl, publishableKey, secretKey } = supabaseEnvironment()
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return jsonResponse(request, { error: 'service_unavailable' }, 503)
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await userClient.auth.getUser(token)
  if (error || !data.user?.email) return jsonResponse(request, { error: 'unauthorized' }, 401)

  let confirmation: string
  try {
    confirmation = requestSchema.parse(await request.json()).confirmation
  } catch {
    return jsonResponse(request, { error: 'validation_error' }, 400)
  }

  if (confirmation.toLowerCase() !== data.user.email.toLowerCase()) {
    return jsonResponse(request, { error: 'confirmation_mismatch' }, 400)
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
  if (deleteError) return jsonResponse(request, { error: 'account_deletion_failed' }, 500)

  return jsonResponse(request, { deleted: true })
})
