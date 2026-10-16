# Local college demo

## Scope

This is a presentation prototype for one computer. It uses a local SQLite file, Docker-backed targets for the Nmap and SQL injection labs, and a bundled synthetic log for the log-analysis lab. Lab actions are fixed by the app; students do not get an unrestricted shell or access to arbitrary networks. No email provider or paid hosting service is needed.

## Demo flow

1. Start Docker Desktop, then start the API, seed demo records, and start the website using the commands in the root README.
2. Sign in as the teacher using the credentials printed by the seed command. Show the class roster, assignments, and results screens.
3. Sign in as a student in another browser profile and launch one of the three interactive labs. Run the fixed Nmap scan, compare the vulnerable and safe SQL actions, or search the sample access log.
4. Submit answers and return to the teacher profile to show the submitted result.

The seed script prints the credentials and join code. Keep those local to the demo and do not reuse them for real accounts. Account setup and password reset messages appear in the API terminal; keep it private.

## Stop and reset

Stop active lab sessions from the app before stopping the API. Normal session stop and expiry remove the per-session Compose project. The two target-based labs have no published host ports and use an internal Docker network. The synthetic log lab does not start a container.
