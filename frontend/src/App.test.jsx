import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function renderSignedIn(role, path = '/') {
    const user = { id: 'student', first_name: 'Aditi', last_name: 'Demo', role, email_verified: true, aup_accepted: true };
    vi.stubGlobal('fetch', vi.fn(async (url) => {
        const values = {
            '/api/me': user,
            '/api/classes': [{ id: 'class', name: 'Security 101', joined_at: '2026-10-18T09:00:00Z' }],
            '/api/classes/class/workspace': { id: 'class', name: 'Security 101', assignments: [{ id: 'work', title: 'Login investigation', status: 'Needs reattempt', passed: false, lab_id: 'sql' }] },
            '/api/labs': [{ id: 'sql', title: 'SQL Injection', category: 'Application Security', difficulty: 'beginner', estimated_minutes: 30, questions: [] }],
            '/api/students/student/history': [],
            '/api/admin/system': { active_sessions: 0, capacity: 40, runtime: 'Docker', sessions: [] },
            '/api/admin/users': [],
            '/api/admin/labs': [],
        };
        return { ok: true, json: async () => values[url] ?? {} };
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(_jsx(QueryClientProvider, { client, children: _jsx(MemoryRouter, { initialEntries: [path], children: _jsx(App, {}) }) }));
    return client;
}
describe('Cyber Range entry', () => {
    it('shows an accessible sign in screen when no session exists', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ detail: 'Authentication required' }) }));
        render(_jsx(App, {}));
        expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        vi.unstubAllGlobals();
    });
    it('lets a student switch to class registration', async () => {
        const user = userEvent.setup();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ detail: 'Authentication required' }) }));
        render(_jsx(App, {}));
        await user.click(await screen.findByRole('button', { name: /new student/i }));
        expect(screen.getByRole('heading', { name: /join your class/i })).toBeInTheDocument();
        vi.unstubAllGlobals();
    });
});

describe('role-specific workspace', () => {
    it('clears cached account data after confirmed sign-out', async () => {
        const client = renderSignedIn('admin');
        await screen.findByRole('heading', { name: 'Administration' });
        client.setQueryData(['class-workspace', 'private'], { private: true });
        const user = userEvent.setup();
        await user.click(screen.getAllByRole('button', { name: 'Open profile menu' })[0]);
        await user.click(screen.getAllByRole('button', { name: 'Sign out', exact: true })[0]);
        await user.click(screen.getByRole('button', { name: 'Confirm sign out' }));
        expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
        expect(client.getQueryData(['class-workspace', 'private'])).toBeUndefined();
    });
    it.each(['/', '/labs'])('keeps admin in Administration without learning navigation at %s', async (path) => {
        const client = renderSignedIn('admin', path);
        expect(await screen.findByRole('heading', { name: 'Administration' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Overview/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Lab catalog/ })).not.toBeInTheDocument();
        expect(fetch.mock.calls.some(([url]) => url === '/api/labs')).toBe(false);
        client.clear();
    });
    it('shows a student overview using real class progress and the shared workspace theme', async () => {
        const client = renderSignedIn('student');
        expect(await screen.findByRole('heading', { name: 'Hello, Aditi.' })).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: 'Reattempt' })).toBeInTheDocument();
        expect(screen.getByText('Joined in October')).toBeInTheDocument();
        expect(screen.queryByText('Learning streak')).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Administration' })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Continue learning' }).closest('.student-page')).toBeInTheDocument();
        client.clear();
    });
});
