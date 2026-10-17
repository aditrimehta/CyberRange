import { useId, useState } from 'react'

export default function ProfileMenu({ user, onLogout, compact = false }) {
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const initial = `${user.first_name[0] || 'U'}${user.last_name[0] || ''}`.toUpperCase()
  async function logout() {
    setBusy(true); setError('')
    try { await onLogout(); setConfirm(false) } catch (reason) { setError(reason.message) } finally { setBusy(false) }
  }
  return <><div className={`profile-menu ${compact ? 'compact-profile' : ''} ${open ? 'is-open' : ''}`} onFocus={() => setOpen(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}>
    <button className="profile profile-trigger" aria-label="Open profile menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(true)}>
      <span className={`avatar ${compact ? 'mini' : ''}`}>{initial}</span>{!compact && <><span className="profile-copy"><strong>{user.first_name} {user.last_name}</strong><span>{user.role}</span></span><span aria-hidden="true">⌃</span></>}
    </button>
    <div className="profile-options" id={menuId}><button className="text-button" onClick={() => { setConfirm(true); setOpen(false) }}>Sign out</button></div>
  </div>{confirm && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="logout-title"><h2 id="logout-title">Sign out?</h2><p>You can sign in again to return to your classes and saved work.</p>{error && <p role="alert">{error}</p>}<div className="lab-action-buttons"><button className="button secondary" onClick={() => setConfirm(false)} disabled={busy}>Cancel</button><button className="button primary" onClick={logout} disabled={busy}>{busy ? 'Signing out…' : 'Confirm sign out'}</button></div></section></div>}</>
}
