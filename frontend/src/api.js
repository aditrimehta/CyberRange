function cookie(name) {
    return document.cookie.split('; ').find((item) => item.startsWith(`${name}=`))?.split('=').slice(1).join('=');
}
export async function api(path, init = {}) {
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    if (init.body && !(init.body instanceof FormData))
        headers.set('Content-Type', 'application/json');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !path.includes('/auth/login') && !path.includes('/auth/register-student') && !path.includes('/password-reset/')) {
        let csrf = cookie('cr_csrf');
        if (!csrf) {
            const result = await fetch('/api/auth/csrf', { credentials: 'include' });
            if (result.ok)
                csrf = (await result.json()).csrf_token;
        }
        if (csrf)
            headers.set('X-CSRF-Token', decodeURIComponent(csrf));
    }
    const response = await fetch(path.startsWith('/api') || path.startsWith('/internal') ? path : `/api${path}`, { ...init, headers, credentials: 'include' });
    if (!response.ok) {
        const payload = await response.json().catch(() => ({ detail: 'The request could not be completed.' }));
        const detail = payload.detail;
        throw Object.assign(new Error(typeof detail === 'string' ? detail : detail?.message ?? 'The request could not be completed.'), { status: response.status, detail });
    }
    if (response.status === 204)
        return undefined;
    return response.json();
}
