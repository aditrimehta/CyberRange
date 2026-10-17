import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { jsx, jsxs } from 'react/jsx-runtime'
import { useLabLaunch } from './useLabLaunch'
import LabLaunchFeedback from './LabLaunchFeedback'
import { api } from './api'

vi.mock('./api', () => ({ api: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

function Launcher() {
  const launch = useLabLaunch()
  return jsxs('div', { children: [jsx('button', { onClick: () => launch.start('new-lab'), children: 'Open lab' }), jsx(LabLaunchFeedback, { launch })] })
}
function setup() {
  return render(jsx(MemoryRouter, { children: jsxs(Routes, { children: [jsx(Route, { path: '/', element: jsx(Launcher, {}) }), jsx(Route, { path: '/workspace/:id', element: jsx('h1', { children: 'Workspace ready' }) })] }) }))
}

describe('lab startup feedback', () => {
  it('immediately shows loading, blocks repeated launches, and opens the ready workspace', async () => {
    let finish
    api.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Open lab' }))
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Preparing your lab')
    await user.click(screen.getByRole('button', { name: 'Open lab' }))
    expect(api).toHaveBeenCalledTimes(1)
    await act(async () => finish({ id: 'ready-session' }))
    expect(await screen.findByRole('heading', { name: 'Workspace ready' })).toBeInTheDocument()
  })

  it('lets the student explicitly stop the old environment before switching', async () => {
    api.mockRejectedValueOnce(Object.assign(new Error('Resume or stop the previous lab.'), { detail: { active_session: { id: 'old-session', lab_title: 'Network lab' } } }))
      .mockResolvedValueOnce({ status: 'stopped' }).mockResolvedValueOnce({ id: 'new-session' })
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Open lab' }))
    expect(await screen.findByRole('button', { name: 'Resume Network lab' })).toBeInTheDocument()
    expect(api).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Stop previous lab and open this one' }))
    expect(api.mock.calls[1][0]).toBe('/lab-sessions/old-session/stop')
    expect(api.mock.calls[2][0]).toBe('/lab-sessions')
    expect(await screen.findByRole('heading', { name: 'Workspace ready' })).toBeInTheDocument()
  })
})
