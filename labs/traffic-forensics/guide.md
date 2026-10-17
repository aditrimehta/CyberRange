# Security Log Analysis

Replay a short incident against a running practice web application. Real HTTP requests generate a new log and a fictional uploaded file inside your disposable environment. The user, source address, failed-login count, and uploaded filename are selected from a training set for each new session. Your details stay the same when you refresh or resume. Source addresses are fictional scenario labels from reserved documentation ranges.

## Tasks

1. Select **Generate training activity**. Generating again does not duplicate events.
2. Investigate failed logins; note their source address, timestamps, and count.
3. Follow the source address you discover in your own results.
4. Investigate the upload; identify its user and filename.
5. Answer using your session's evidence and submit.

## Investigation hints

Try `result=failed`, `result=success`, or `action=file_upload`. These are suggested searches, not exact keywords you must type. The evidence indicators update when relevant events appear in your search results. Equivalent searches count, and reviewed evidence is saved across refreshes.

The search reads `/state/access.log` inside your session's target. This teaches event correlation on artifacts produced by the application itself. Your computer's logs are outside the lab. Stop, submit, or expire the session to remove its log and uploaded file.
