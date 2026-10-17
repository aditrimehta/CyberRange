# Local college demo

## Scope

This is a presentation prototype for one computer. One Ubuntu WSL2 host runs disposable Docker environments for exactly three exercises. Lab actions change real services, database queries, and application logs. Students use guided controls; no terminal setup or paid hosting is needed.

## Demo flow

1. Start Docker Desktop, then start the API, seed demo records, and start the website using the commands in the root README.
2. Sign in as the teacher using the credentials printed by the seed command. Show the class roster, assignments, and results screens.
3. Sign in as a student in another browser profile. Scan, close inventory, and rescan in Nmap; bypass and fix the SQL login; or generate HTTP activity and search the resulting log.
4. Submit answers and return to the teacher profile to show the submitted result.

The seed script prints the credentials and join code. Keep those local to the demo and do not reuse them for real accounts. Account setup and password reset messages appear in the API terminal; keep it private.

## Stop and reset

Stop active labs before stopping the API so cleanup can run. Stop, submission, expiry, and idle cleanup remove the session's containers, private network, and temporary database/logs. The shared Linux host and image cache remain. All three labs use private networks without published host ports. If the API is stopped abruptly, its reaper resumes cleanup after restart.
