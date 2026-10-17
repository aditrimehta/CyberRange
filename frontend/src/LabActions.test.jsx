import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LabActions from './LabActions'
import { api } from './api'
import { jsx } from 'react/jsx-runtime'

vi.mock('./api', () => ({ api: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('saved lab activity', () => {
  it('restores reviewed evidence and explains the optional search hints', () => {
    render(jsx(LabActions, { id: 'session', slug: 'traffic-forensics', initialEvidence: { log_searches: ['192.0.2.44', 'file_upload'] } }))
    expect(screen.getByRole('status')).toHaveTextContent('✓ Failed-login source')
    expect(screen.getByRole('status')).toHaveTextContent('✓ Upload event')
    expect(screen.getByText('Investigation hints')).toBeInTheDocument()
    expect(screen.getByText(/even if you used different keywords/)).toBeInTheDocument()
  })

  it('shows the evidence confirmed by the server after a search', async () => {
    api.mockResolvedValue({ matches: 1, output: 'matching line', lab_evidence: { log_searches: ['file_upload'] } })
    const user = userEvent.setup()
    render(jsx(LabActions, { id: 'session', slug: 'traffic-forensics', initialEvidence: { incident_generated: true } }))
    await user.type(screen.getByLabelText('Search log'), 'file_upload')
    await user.click(screen.getByRole('button', { name: 'Search log' }))
    expect(screen.getByRole('status')).toHaveTextContent('✓ Upload event')
    expect(screen.getByRole('status')).toHaveTextContent('○ Failed-login source')
  })
})
