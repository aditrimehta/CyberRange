import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jsx } from 'react/jsx-runtime'
import ProfileMenu from './ProfileMenu'

afterEach(cleanup)
it('opens a separate sign-out option and requires confirmation', async () => {
  const logout = vi.fn().mockResolvedValue(undefined)
  const user = userEvent.setup()
  render(jsx(ProfileMenu, { user: { first_name: 'A', last_name: 'Student', role: 'student' }, onLogout: logout }))
  await user.hover(screen.getByRole('button', { name: 'Open profile menu' }))
  expect(logout).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Sign out' }))
  expect(screen.getByRole('dialog', { name: 'Sign out?' })).toBeInTheDocument()
  expect(logout).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(logout).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Open profile menu' }))
  await user.click(screen.getByRole('button', { name: 'Sign out' }))
  await user.click(screen.getByRole('button', { name: 'Confirm sign out' }))
  expect(logout).toHaveBeenCalledTimes(1)
})
