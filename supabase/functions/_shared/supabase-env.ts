function namedKey(environmentName: string, keyName: string): string | null {
  const raw = Deno.env.get(environmentName)
  if (!raw) return null
  try {
    const keys = JSON.parse(raw) as Record<string, unknown>
    return typeof keys[keyName] === 'string' ? keys[keyName] : null
  } catch {
    return null
  }
}

export function supabaseEnvironment() {
  const secretKeyName = Deno.env.get('SUPABASE_SECRET_KEY_NAME') ?? 'default'
  return {
    url: Deno.env.get('SUPABASE_URL'),
    publishableKey: namedKey('SUPABASE_PUBLISHABLE_KEYS', 'default') ?? Deno.env.get('SUPABASE_ANON_KEY'),
    secretKey: namedKey('SUPABASE_SECRET_KEYS', secretKeyName) ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  }
}
