import { useQuery } from '@tanstack/react-query'
import { api } from './api'

export default function AttemptReview({ attemptId, onClose }) {
  const attempt = useQuery({ queryKey: ['attempt-review', attemptId], queryFn: () => api(`/attempts/${attemptId}`) })
  return <div className="modal-backdrop"><section className="modal attempt-review" role="dialog" aria-modal="true" aria-labelledby="attempt-review-title"><h2 id="attempt-review-title">Practice attempt</h2>
    {attempt.isPending && <p role="status">Loading saved answers…</p>}{attempt.isError && <p role="alert">{attempt.error.message}</p>}
    {attempt.data && <><p>{attempt.data.score}/{attempt.data.max_score} · {attempt.data.percentage}% · {attempt.data.passed ? 'Passed' : 'Needs reattempt'}</p>{attempt.data.per_question_results.map((question) => <div className="result-item" key={question.qid}><div><strong>{question.prompt || `Question ${question.qid}`}</strong><p>Answer: {String(attempt.data.answers[question.qid] ?? 'No answer')}</p><p>{question.correct ? 'Correct' : 'Incorrect'} · {question.points_earned}/{question.points_possible}</p><p>{question.explanation}</p></div></div>)}</>}
    <button className="button secondary wide" onClick={onClose}>Close review</button>
  </section></div>
}
