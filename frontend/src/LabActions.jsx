import { useState } from 'react'
import { api } from './api'

const names = {
  'nmap-network-recon': 'Private Nmap target',
  'sql-injection': 'Disposable SQL training target',
  'traffic-forensics': 'Synthetic access log',
}

export default function LabActions({ id, slug, expiresAt }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [query, setQuery] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [completed, setCompleted] = useState([])
  const [lastAction, setLastAction] = useState('')
  const [vulnerableInput, setVulnerableInput] = useState(null)

  async function run(action, values = {}) {
    setBusy(true)
    setError('')
    try {
      const result = await api(`/lab-sessions/${id}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action, values }),
      })
      setOutput(result.output || 'Action completed with no output.')
      setLastAction(action)
      if (slug === 'nmap-network-recon' && action === 'scan' && result.exit_code === 0) setCompleted(['scan'])
      if (slug === 'sql-injection') {
        let matchedAccounts = []
        try { matchedAccounts = JSON.parse(result.output || '{}').matched_accounts || [] } catch { /* Keep the action unverified if output is not readable. */ }
        if (action === 'vulnerable_login' && matchedAccounts.length > 1) {
          setVulnerableInput(values.username)
          setCompleted((previous) => [...new Set([...previous, action])])
        }
        if (action === 'safe_login' && matchedAccounts.length === 0 && values.username === vulnerableInput) {
          setCompleted((previous) => [...new Set([...previous, action])])
        }
      }
      if (slug === 'traffic-forensics' && result.matches > 0) {
        setCompleted((previous) => [...new Set([...previous, values.query.trim().toLowerCase()])])
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The lab action failed.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="desktop-panel lab-action-panel">
    <div className="desktop-top"><span><i className="status-dot" /> {names[slug] || 'Lab tools'}</span><span className="desktop-dots">●●●</span></div>
    <div className="lab-action-content">
      <p className="eyebrow">WHAT THIS LAB DOES</p>
      {slug === 'nmap-network-recon' && <div className="lab-explainer"><p>Nmap checks a private, disposable practice computer for open network ports. A port is like a numbered doorway; the result tells you which training services answer.</p><ol><li>Run the service scan.</li><li>Look for ports marked <code>open</code> and note the service names.</li><li>Use those results to answer the questions, then submit.</li></ol><p className="lab-success-hint">Success looks like scan results listing the training target’s open ports.</p></div>}
      {slug === 'sql-injection' && <div className="lab-explainer"><p>This compares a deliberately unsafe login check with a safer parameterized check, using fictional accounts in a disposable database.</p><ol><li>Try a normal username first to see the baseline.</li><li>Paste the example training payload into Username and run the vulnerable check.</li><li>Run the safe check with the same username. Compare the results.</li><li>Answer the questions and submit.</li></ol><p className="lab-success-hint">Success looks like the vulnerable check matching sample accounts while the safe check rejects the same input.</p></div>}
      {slug === 'traffic-forensics' && <div className="lab-explainer"><p>You are investigating a fictional web access log. Search terms show matching lines so you can build a short timeline of suspicious activity.</p><ol><li>Search for <code>failed</code> to find failed requests.</li><li>Search for <code>192.0.2.44</code> to follow one source address.</li><li>Search for <code>file_upload</code> to find the upload event.</li><li>Use the evidence to answer the questions, then submit.</li></ol><p className="lab-success-hint">Success looks like matching log lines for both <code>192.0.2.44</code> and <code>file_upload</code>.</p></div>}
      <p className="eyebrow lab-step-heading">DO THE EXERCISE</p>
      {slug === 'nmap-network-recon' && <>
        <button className="button primary" onClick={() => run('scan')} disabled={busy}>{busy ? 'Scanning…' : 'Run service scan'}</button>
        <p className="lab-progress" role="status">{completed.includes('scan') ? '✓ Service scan completed. Review its output and answer the questions.' : '○ Service scan not run yet.'}</p>
      </>}
      {slug === 'sql-injection' && <>
        <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={120} autoComplete="off" /></label>
        <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} maxLength={120} autoComplete="off" /></label>
        <div className="lab-action-buttons">
          <button className="button primary" onClick={() => run('vulnerable_login', { username, password })} disabled={busy}>{busy ? 'Running…' : 'Try vulnerable login'}</button>
          <button className="button secondary" onClick={() => run('safe_login', { username, password })} disabled={busy}>Try safe login</button>
        </div>
        <p className="lab-action-hint">Training payload: <code>' OR '1'='1' -- </code> (enter it as the username).</p>
        <p className="lab-progress" role="status">Evidence: {['vulnerable_login', 'safe_login'].map((action) => `${completed.includes(action) ? '✓' : '○'} ${action === 'vulnerable_login' ? 'Vulnerable bypass observed' : 'Same input rejected by safe check'}`).join('   ')}</p>
      </>}
      {slug === 'traffic-forensics' && <>
        <label>Search log<input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={80} /></label>
        <button className="button primary" onClick={() => run('search_logs', { query })} disabled={busy || query.trim().length < 2}>{busy ? 'Searching…' : 'Search log'}</button>
        <p className="lab-progress" role="status">Required searches: {['192.0.2.44', 'file_upload'].map((term) => `${completed.includes(term) ? '✓' : '○'} ${term}`).join('   ')}</p>
      </>}
      {error && <p role="alert" className="error-banner">{error}</p>}
      {output && <div className="lab-results"><strong>{lastAction === 'scan' || lastAction.includes('login') || lastAction === 'search_logs' ? 'Latest result' : 'Result'}</strong><pre className="lab-action-output" aria-live="polite">{output}</pre></div>}
      <div className="desktop-footer"><span>Local training environment</span><span>Expires {expiresAt ? new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span></div>
    </div>
  </section>
}
