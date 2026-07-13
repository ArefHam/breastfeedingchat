import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const forbidden = [
  { label: 'Supabase secret key', pattern: /sb_secret_[A-Za-z0-9_-]+/ },
  { label: 'database connection string', pattern: /postgres(?:ql)?:\/\//i },
  { label: 'service-role token', pattern: /service_role/i },
  { label: 'direct n8n webhook', pattern: /https:\/\/[^"'\s]*n8n[^"'\s]*\/webhook\//i },
]

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(path) : [path]
  }))
  return nested.flat()
}

const failures = []
for (const file of await filesUnder(fileURLToPath(new URL('../dist', import.meta.url)))) {
  const content = await readFile(file, 'utf8').catch(() => '')
  for (const rule of forbidden) {
    if (rule.pattern.test(content)) failures.push(`${rule.label} found in ${file}`)
  }
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Production bundle contains no forbidden server credentials or direct n8n webhook URL.')
