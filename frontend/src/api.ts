export type User = { id: string; email: string; role: 'admin' | 'teacher' | 'student'; first_name: string; last_name: string; must_change_password: boolean; aup_accepted: boolean; email_verified?: boolean }
export type Lab = { id: string; slug: string; title: string; summary: string; category: string; difficulty: string; estimated_minutes: number; questions: Question[] }
export type Question = { id: string; type: string; prompt: string; points: number; options?: unknown[]; hints?: string[] }

function cookie(name: string): string | undefined {
  return document.cookie.split('; ').find((item) => item.startsWith(`${name}=`))?.split('=').slice(1).join('=')
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !path.includes('/auth/login') && !path.includes('/auth/register-student') && !path.includes('/password-reset/')) {
    let csrf = cookie('cr_csrf')
    if (!csrf) {
      const result = await fetch('/api/auth/csrf', { credentials: 'include' })
      if (result.ok) csrf = (await result.json()).csrf_token as string
    }
    if (csrf) headers.set('X-CSRF-Token', decodeURIComponent(csrf))
  }
  const response = await fetch(path.startsWith('/api') || path.startsWith('/internal') ? path : `/api${path}`, { ...init, headers, credentials: 'include' })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: 'The request could not be completed.' }))
    throw new Error(payload.detail ?? 'The request could not be completed.')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
