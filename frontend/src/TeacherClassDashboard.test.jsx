import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { jsx } from 'react/jsx-runtime'
import TeacherClassDashboard from './TeacherClassDashboard'
import { api } from './api'

vi.mock('./api', () => ({ api: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const data = {
  id: 'class-one', name: 'Security 101', pass_mark: 80, join_code: 'CLASS123',
  analytics: { completion_rate: .5, target_count: 2, passed_count: 1, submitted_count: 2, needs_reattempt_count: 1, average_score: .75, attempt_count: 2 },
  students: [
    { id: 'ada', first_name: 'Ada', last_name: 'Rao', email: 'ada@example.test', assigned: 1, submitted: 1, passed: 0, needs_reattempt: 1, attempts: 1, duration_seconds: 240 },
    { id: 'lin', first_name: 'Lin', last_name: 'Roy', email: 'lin@example.test', assigned: 1, submitted: 1, passed: 1, needs_reattempt: 0, attempts: 1, duration_seconds: 180 },
  ],
  assignments: [{ id: 'assignment', title: 'Scan and improve', lab_id: 'nmap', lab_title: 'Network lab', scoring_policy: 'best', students: [{ student_id: 'ada', name: 'Ada Rao', score: 40, max_score: 60, passed: false, needs_reattempt: true, attempts: 1 }, { student_id: 'lin', name: 'Lin Roy', score: 60, max_score: 60, passed: true, needs_reattempt: false, attempts: 1 }] }],
  extra_practice: [{ id: 'practice', student_id: 'ada', student_name: 'Ada Rao', lab_title: 'SQL lab', score: 60, max_score: 60, percentage: 100, passed: true, submitted_at: '2026-10-18T09:00:00Z', duration_seconds: 120 }],
}
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(jsx(QueryClientProvider, { client, children: jsx(MemoryRouter, { children: jsx(TeacherClassDashboard, { data }) }) }))
}
it('filters students needing a retry and opens their assignment breakdown', async () => {
  const user = userEvent.setup()
  setup()
  await user.click(screen.getByRole('tab', { name: 'Students 2' }))
  await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'retry')
  expect(screen.getByText('Ada Rao')).toBeInTheDocument()
  expect(screen.queryByText('Lin Roy')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'View Ada' }))
  expect(screen.getByRole('heading', { name: 'Assignment breakdown · Ada' })).toBeInTheDocument()
  expect(screen.getByText('Scan and improve')).toBeInTheDocument()
  await user.type(screen.getByRole('searchbox', { name: 'Search students' }), 'nobody')
  expect(screen.getByText('No students match these filters.')).toBeInTheDocument()
})
it('opens saved answers from the extra-practice tab', async () => {
  api.mockResolvedValue({ score: 60, max_score: 60, percentage: 100, passed: true, answers: { q1: 'bound parameters' }, per_question_results: [{ qid: 'q1', prompt: 'Which defense works?', correct: true, points_earned: 10, points_possible: 10, explanation: 'Treat input as data.' }] })
  const user = userEvent.setup()
  setup()
  await user.click(screen.getByRole('tab', { name: 'Extra practice 1' }))
  await user.click(screen.getByRole('button', { name: 'Review answers →' }))
  expect(await screen.findByText('Answer: bound parameters')).toBeInTheDocument()
  expect(api).toHaveBeenCalledWith('/attempts/practice')
})
it('assigns a lab from the focused dialog without a browser alert', async () => {
  api.mockImplementation(async (path) => path === '/labs' ? [{ id: 'nmap', title: 'Network lab' }] : { id: 'assignment' })
  const user = userEvent.setup()
  setup()
  await user.click(screen.getByRole('button', { name: '+ Assign lab' }))
  await user.selectOptions(await screen.findByRole('combobox', { name: 'Lab' }), 'nmap')
  await user.type(screen.getByRole('textbox', { name: 'Assignment title' }), 'First scan')
  await user.click(screen.getByRole('button', { name: 'Create assignment' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  const [, request] = api.mock.calls.find(([path]) => path === '/assignments')
  expect(JSON.parse(request.body)).toMatchObject({ class_id: 'class-one', lab_id: 'nmap', title: 'First scan', max_attempts: 3, scoring_policy: 'best' })
})
