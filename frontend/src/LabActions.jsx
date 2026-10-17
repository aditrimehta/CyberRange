import { useState } from 'react'
import { api } from './api'

const lessons = {
  'nmap-network-recon': {
    title: 'Find and reduce exposed services',
    goal: 'Discover what a host exposes, remove an unnecessary service, and verify that the attack surface is smaller.',
    scenario: 'You are checking a new training server. Retire the unnecessary listener identified in your session briefing while keeping the other services available.',
    steps: ['Scan the host and count its open ports.', 'Disable the unnecessary listener shown in your briefing.', 'Rescan and verify that the selected port is closed and the other services stay available.'],
    purpose: 'The scan contacts real listeners over the private lab network. Closing the listener changes the running target; the second scan measures that change.',
  },
  'sql-injection': {
    title: 'Break a login, fix it, test again',
    goal: 'Understand how SQL injection changes query behavior and verify that parameter binding prevents the same bypass.',
    scenario: 'A training application builds its login query from raw input. Demonstrate the flaw, then switch the application to its prepared safe implementation.',
    steps: ['Try student / demo-student-password for a normal login.', "Use your session’s training payload as Username and any password. Count the matched accounts and inspect their roles.", 'Apply the parameterized query fix with the same input. It should match zero accounts.', 'Try a normal login again: legitimate access should still work.'],
    purpose: 'The exercise uses a real SQLite database inside your environment. Applying the fix changes the session’s saved application mode, so subsequent login tests use the protected query.',
  },
  'traffic-forensics': {
    title: 'Create activity and investigate its logs',
    goal: 'Trace failed logins to a source, count events, and correlate an upload with the surrounding activity.',
    scenario: 'You are the analyst for a small training web application. Replay a short incident, then investigate the log written by that running application.',
    steps: ['Generate training activity inside your isolated environment.', 'Investigate failed logins: count the events and identify their source.', 'Follow the source address you find in the results.', 'Find the upload event and identify its actor and file. Your session has its own incident details.'],
    purpose: 'The application writes a new /state/access.log from the replayed requests and creates a fictional uploaded file. You investigate this session’s live artifacts rather than a shared sample file. Source addresses are fictional scenario labels.',
  },
}

export default function LabActions({ id, slug, expiresAt, initialEvidence = {}, briefing = {} }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [query, setQuery] = useState('')
  const [evidence, setEvidence] = useState(initialEvidence)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lesson = lessons[slug]
  if (!lesson) return null

  async function run(action, values = {}) {
    setBusy(true)
    setError('')
    try {
      const result = await api(`/lab-sessions/${id}/actions`, { method: 'POST', body: JSON.stringify({ action, values }) })
      setEvidence(result.lab_evidence || {})
      const labels = { scan: evidence.service_closed ? 'Verification scan' : 'Baseline scan', close_service: 'Service change', vulnerable_login: 'Login test', safe_login: 'Apply fix and retest', generate_incident: 'Training activity', search_logs: `Search: ${values.query}` }
      setResults((previous) => [...previous.slice(-7), { title: labels[action], output: result.output || 'No output.', failed: result.exit_code !== 0 }])
      if (result.exit_code !== 0) setError('The action did not complete. Review the output and retry.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The lab action failed.')
    } finally {
      setBusy(false)
    }
  }

  const mark = (done, label) => `${done ? '✓' : '○'} ${label}`
  const searched = evidence.log_searches || []
  return <section className="desktop-panel lab-action-panel">
    <div className="desktop-top"><span><i className="status-dot" /> Interactive practice environment</span></div>
    <div className="lab-action-content">
      <p className="eyebrow">WHAT YOU WILL LEARN</p>
      <h2>{lesson.title}</h2>
      <div className="lab-explainer">
        <p><strong>Learning goal:</strong> {lesson.goal}</p>
        <p>{lesson.scenario}</p>
        <ol>{lesson.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <p><strong>Why an isolated environment?</strong> {lesson.purpose}</p>
        <p className="lab-success-hint">Your environment is disposable. Stopping, submitting, or reaching the session time limit removes its containers, private network, and temporary files. The shared Linux host stays available.</p>
      </div>
      <p className="eyebrow lab-step-heading">DO THE EXERCISE</p>
      {slug === 'nmap-network-recon' && <>
        <p className="lab-action-hint">Session briefing: retire the unnecessary listener on port <strong>{briefing.close_port || 9001}</strong>. Discover the service name and initial open-port count from your own scan.</p>
        <div className="lab-action-buttons">
          <button className="button primary" onClick={() => run('scan')} disabled={busy}>{busy ? 'Working…' : evidence.service_closed ? '3. Rescan and verify' : '1. Scan the host'}</button>
          <button className="button secondary" onClick={() => run('close_service')} disabled={busy || !evidence.scan_completed || evidence.service_closed}>2. Close unnecessary service</button>
        </div>
        <p className="lab-action-hint">The platform runs a bounded Nmap service scan against your private target. The output lists the command’s session-specific ports and service banners.</p>
        <p className="lab-progress" role="status">{[mark(evidence.scan_completed, 'Baseline scan'), mark(evidence.service_closed, 'Service disabled'), mark(evidence.rescan_verified, 'Port closure verified')].join(' · ')}</p>
      </>}
      {slug === 'sql-injection' && <>
        <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={120} autoComplete="off" /></label>
        <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} maxLength={120} autoComplete="off" /></label>
        <div className="lab-action-buttons">
          <button className="button primary" onClick={() => run('vulnerable_login', { username, password })} disabled={busy}>{busy ? 'Working…' : 'Test current login'}</button>
          <button className="button secondary" onClick={() => run('safe_login', { username, password })} disabled={busy || !evidence.vulnerable_bypass_observed || evidence.safe_query_observed}>Apply fix and retest same input</button>
        </div>
        <div className="lab-explainer"><h3>What is a training payload?</h3><p>A payload is specially chosen input used to test how an application handles data. Enter <code>{briefing.training_payload || "' OR '1'='1' -- "}</code> as Username in this practice application.</p><p>The first quote closes the username string. <code>OR</code> adds an always-true condition, such as <code>1=1</code>. <code>-- </code> starts a SQL comment, so the rest of the unsafe login check is ignored. The unsafe query can therefore return several accounts without a valid password. This is a boolean-based login bypass.</p><p>The fixed query uses <code>WHERE username = ? AND password = ?</code> with bound values. It treats the whole payload as a username rather than SQL code.</p><details><summary>Are there other types?</summary><ul><li><strong>Boolean-based:</strong> compare true and false conditions. This lab uses a true condition; <code>' OR 1=2 -- </code> is a false-condition example.</li><li><strong>UNION-based:</strong> attempts to combine results from another compatible query. It depends on the number and type of returned columns.</li><li><strong>Error-based:</strong> learns from database errors that an application exposes.</li><li><strong>Blind or time-based:</strong> infers information from changes in the response or its timing when data is not displayed.</li></ul><p>This beginner exercise demonstrates the boolean bypass and its fix. Other techniques depend on the application and database; they are not additional tasks in this lab.</p></details><p>Your session’s account count, administrator role, and example payload may differ from another student’s. Answer from your own results.</p></div>
        <p className="lab-progress" role="status">{[mark(evidence.vulnerable_bypass_observed, 'Bypass observed'), mark(evidence.safe_query_observed, 'Same input rejected after fix')].join(' · ')}</p>
      </>}
      {slug === 'traffic-forensics' && <>
        <button className="button secondary" onClick={() => run('generate_incident')} disabled={busy || evidence.incident_generated}>1. Generate training activity</button>
        <label>Search log<input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !busy && query.trim().length >= 2 && evidence.incident_generated) run('search_logs', { query }) }} maxLength={80} /></label>
        <button className="button primary" onClick={() => run('search_logs', { query })} disabled={busy || query.trim().length < 2 || !evidence.incident_generated}>{busy ? 'Working…' : 'Search log'}</button>
        <details className="lab-explainer">
          <summary>Investigation hints</summary>
          <ul><li>Try <code>result=failed</code> to find failed logins, then search for the source address you discover.</li><li>Try <code>action=file_upload</code> to find the upload.</li><li>Use <code>result=success</code> to identify the successful login.</li></ul>
          <p>These are suggested searches. Evidence is marked as reviewed when it appears in your results, even if you used different keywords. Read the results to find your session’s answers.</p>
        </details>
        <p className="lab-progress" role="status">Evidence reviewed: {[mark(evidence.incident_generated, 'Activity generated'), mark(searched.some((term) => term !== 'file_upload'), 'Failed-login source'), mark(searched.includes('file_upload'), 'Upload event')].join(' · ')}</p>
      </>}
      {error && <p role="alert" className="error-banner">{error}</p>}
      {results.length > 0 && <div className="lab-results"><h3>Your observations</h3><p>Compare the results, then answer the questions below. This output history is cleared on refresh; completed steps are saved.</p>{results.map((result, index) => <div key={index}><strong>{result.title}{result.failed ? ' — failed' : ''}</strong><pre className="lab-action-output" aria-live="polite">{result.output}</pre></div>)}</div>}
      <div className="desktop-footer"><span>Private, disposable environment</span><span>Expires {expiresAt ? new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span></div>
    </div>
  </section>
}
