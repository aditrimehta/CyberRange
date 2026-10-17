export function SummaryCard({ label, value, note, tone = '' }) {
  return <div className={`teacher-stat ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
}

export function StudentLabCard({ lab, index = 0, onStart }) {
  return <article className="student-lab-card"><div className="student-lab-card-top"><span className={`teacher-class-icon tone-${index % 3}`}>{['⌘', '⌁', '◇'][index % 3]}</span><span className="teacher-badge good">{lab.difficulty}</span></div><p className="eyebrow">{lab.category}</p><h3>{lab.title}</h3><p>{lab.summary}</p><div className="student-lab-meta"><span>◷ {lab.estimated_minutes} min</span><span>{lab.questions?.length || 0} questions</span></div><button className="button secondary wide" onClick={onStart}>Open lab →</button></article>
}

export function StudentStatus({ status }) {
  return <span className={`teacher-badge ${status === 'Passed' ? 'good' : status === 'Needs reattempt' ? 'warm' : ''}`}>{status}</span>
}

export function StudentAssignmentCards({ assignments, onStart }) {
  return <div className="teacher-assignment-grid">{assignments.map((item) => <article className="teacher-assignment-card student-assignment-card" key={item.id}>
    <div className="teacher-assignment-top"><p className="eyebrow">{item.lab_title}</p><span className={`teacher-badge ${item.passed ? 'good' : item.status === 'Needs reattempt' ? 'warm' : ''}`}>{item.status}</span></div>
    <h3>{item.title}</h3><p>{item.instructions || 'Complete the guided exercise and answer the questions from your own observations.'}</p>
    <div className="student-assignment-facts"><span>Due date<strong>{item.due_at ? new Date(item.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No due date'}</strong></span><span>Your score<strong>{item.score !== null ? `${item.score}/${item.max_score}` : 'Not submitted'}</strong></span><span>Attempts<strong>{item.attempts}</strong></span></div>
    <div className="teacher-assignment-meta"><span>{item.scoring_policy === 'best' ? 'Best attempt reported' : 'Latest attempt reported'}</span><span>80% to pass</span></div>
    <button className={`button ${item.passed ? 'secondary' : 'primary'} wide`} aria-label={item.active_session_id ? 'Resume lab' : item.status === 'Needs reattempt' ? 'Reattempt lab' : item.passed ? 'Practice again' : 'Start assignment'} onClick={() => onStart(item.lab_id, item.passed && !item.active_session_id ? undefined : item.id)}>{item.active_session_id ? 'Resume lab →' : item.status === 'Needs reattempt' ? 'Reattempt lab →' : item.passed ? 'Practice again →' : 'Start assignment →'}</button>
    {item.status === 'Needs reattempt' && <p className="student-retry-note">Review your feedback and try again. Remediation stays available until you pass.</p>}
  </article>)}</div>
}
