import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
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
