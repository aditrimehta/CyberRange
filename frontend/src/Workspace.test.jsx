import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { jsx } from 'react/jsx-runtime'
import { Workspace } from './App'
import { api } from './api'

vi.mock('./api', () => ({ api: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
it.each(['nmap-network-recon', 'sql-injection', 'traffic-forensics'])('puts Submit below answers and offers a retry below 80%% for %s', async (slug) => {
  api.mockImplementation(async (path, init) => {
    if (path === '/lab-sessions/session/submit') return { score: 30, max_score: 60, passed: false, per_question_results: [] }
    if (path === '/lab-sessions/session') return { id: 'session', lab_id: 'lab', lab_slug: slug, lab_title: 'Practice', status: 'running' }
    if (path.startsWith('/labs/')) return { guide_markdown: 'Practice guide', questions: [{ id: 'q1', type: 'short_text', prompt: 'What did you observe?', points: 10, hints: [] }] }
    if (path === '/lab-sessions' && init?.method === 'POST') return { id: 'new-session' }
    if (path === '/lab-sessions/new-session') return { id: 'new-session', lab_id: 'lab', lab_slug: slug, lab_title: 'Fresh practice', status: 'running' }
    throw new Error(path)
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(jsx(QueryClientProvider, { client: queryClient, children: jsx(MemoryRouter, { initialEntries: ['/workspace/session'], children: jsx(Routes, { children: jsx(Route, { path: '/workspace/:id', element: jsx(Workspace, {}) }) }) }) }))
  const user = userEvent.setup()
  const submit = await screen.findByRole('button', { name: 'Submit answers' })
  const questions = screen.getByRole('complementary')
  expect(within(questions).getByRole('button', { name: 'Submit answers' })).toBe(submit)
  expect(questions.querySelector('.question-item').compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  await user.click(submit)
  expect(await screen.findByText(/Needs reattempt — reach 80%/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Reattempt lab' }))
  expect(await screen.findByRole('heading', { name: 'Fresh practice' })).toBeInTheDocument()
  expect(screen.queryByText(/Needs reattempt — reach 80%/)).not.toBeInTheDocument()
  queryClient.clear()
})
