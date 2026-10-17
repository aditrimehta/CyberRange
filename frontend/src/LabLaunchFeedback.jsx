export default function LabLaunchFeedback({ launch }) {
  const state = launch.state
  if (!state) return null
  return <div className="modal-backdrop">
    <section className="modal launch-dialog" role="dialog" aria-modal="true" aria-labelledby="launch-title" aria-busy={!!state.pending}>
      {state.pending ? <>
        <div className="loading-spinner" aria-hidden="true" />
        <h2 id="launch-title">{state.message?.startsWith('Preparing') ? 'Preparing your lab' : 'Please wait'}</h2>
        <p role="status" aria-live="polite">{state.message}</p>
        {state.message?.includes('lab') && !state.message?.startsWith('Stopping lab') && <p>The workspace will open automatically when it is ready. First startup can take a few minutes while the environment is built.</p>}
      </> : <>
        <h2 id="launch-title">{state.active ? 'You already have a lab open' : 'Could not open the lab'}</h2>
        <p role="alert">{state.error}</p>
        {state.active && <div className="form-stack">
          <button className="button primary" onClick={launch.resume}>Resume {state.active.lab_title}</button>
          <button className="button secondary" onClick={() => launch.start(state.labId, state.assignmentId, state.active.id)}>Stop previous lab and open this one</button>
          <p>Stopping removes the previous environment. Save any answers you need before switching.</p>
        </div>}
        <button className="text-button" onClick={launch.dismiss}>Back to labs</button>
      </>}
    </section>
  </div>
}
