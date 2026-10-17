import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { jsx, jsxs } from 'react/jsx-runtime'
import ClassWorkspace from './ClassWorkspace'
import StudentClasses from './StudentClasses'
import { api } from './api'

vi.mock('./api', () => ({ api: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('opens a joined class and launches its assignment for remediation', async () => {
  api.mockImplementation(async (path) => {
    if (path === '/classes') return [{ id: 'class-one', name: 'Security 101', term: 'Fall' }, { id: 'class-two', name: 'Networks', term: 'Fall' }]
    if (path === '/classes/class-one/workspace') return { id: 'class-one', name: 'Security 101', teacher: 'A Teacher', term: 'Fall', pass_mark: 80, assignments: [{ id: 'assignment-one', title: 'Login investigation', lab_id: 'sql', lab_title: 'SQL Injection', status: 'Needs reattempt', score: 30, max_score: 60, attempts: 1, passed: false, scoring_policy: 'best' }] }
    if (path === '/lab-sessions') return { id: 'retry-session' }
    throw new Error(path)
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(jsx(QueryClientProvider, { client, children: jsx(MemoryRouter, { children: jsxs(Routes, { children: [jsx(Route, { path: '/', element: jsx(StudentClasses, {}) }), jsx(Route, { path: '/classes/:classId', element: jsx(ClassWorkspace, { user: { role: 'student' } }) }), jsx(Route, { path: '/workspace/:id', element: jsx('h1', { children: 'Lab workspace' }) })] }) }) }))
  const user = userEvent.setup()
  await user.click(await screen.findByRole('link', { name: /Security 101/ }))
  expect(await screen.findByRole('heading', { name: 'Login investigation' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Reattempt lab' })).toBeInTheDocument()
  expect(screen.queryByText('Student progress')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Reattempt lab' }))
  expect(await screen.findByRole('heading', { name: 'Lab workspace' })).toBeInTheDocument()
  const launch = api.mock.calls.find(([path]) => path === '/lab-sessions')
  expect(JSON.parse(launch[1].body)).toEqual({ lab_id: 'sql', assignment_id: 'assignment-one' })
  client.clear()
})
