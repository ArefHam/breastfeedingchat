import { createClient } from '@supabase/supabase-js'

const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'RLS_USER_A_EMAIL',
  'RLS_USER_A_PASSWORD',
  'RLS_USER_A_CONVERSATION_ID',
  'RLS_USER_B_EMAIL',
  'RLS_USER_B_PASSWORD',
  'RLS_USER_B_CONVERSATION_ID',
]

for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`)
}

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

async function signedInClient(email, password) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
}

async function expectOwnAndRejectOther(client, ownId, otherId, label) {
  const { data: own, error: ownError } = await client.from('conversations').select('id').eq('id', ownId).single()
  if (ownError || own?.id !== ownId) throw new Error(`${label} cannot read its own conversation`)

  const { data: foreignRead, error: foreignReadError } = await client
    .from('conversations')
    .select('id')
    .eq('id', otherId)
    .maybeSingle()
  if (foreignReadError || foreignRead !== null) throw new Error(`${label} could read another user's conversation`)

  const { data: foreignUpdate, error: foreignUpdateError } = await client
    .from('conversations')
    .update({ title: 'RLS violation' })
    .eq('id', otherId)
    .select('id')
  if (foreignUpdateError || foreignUpdate.length !== 0) throw new Error(`${label} could update another user's conversation`)

  const { data: foreignDelete, error: foreignDeleteError } = await client
    .from('conversations')
    .delete()
    .eq('id', otherId)
    .select('id')
  if (foreignDeleteError || foreignDelete.length !== 0) throw new Error(`${label} could delete another user's conversation`)
}

const userA = await signedInClient(process.env.RLS_USER_A_EMAIL, process.env.RLS_USER_A_PASSWORD)
const userB = await signedInClient(process.env.RLS_USER_B_EMAIL, process.env.RLS_USER_B_PASSWORD)

await expectOwnAndRejectOther(userA, process.env.RLS_USER_A_CONVERSATION_ID, process.env.RLS_USER_B_CONVERSATION_ID, 'User A')
await expectOwnAndRejectOther(userB, process.env.RLS_USER_B_CONVERSATION_ID, process.env.RLS_USER_A_CONVERSATION_ID, 'User B')

console.log('RLS verification passed for two independent users and both conversation UUIDs.')
