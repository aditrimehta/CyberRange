# SQL injection: the query boundary

## Learning objectives

Identify a query that mixes SQL syntax with user input, demonstrate the effect only against the supplied local target, and explain why parameter binding fixes the underlying cause.

## The idea

SQL injection occurs when an application constructs a query by concatenating untrusted text into SQL source. An attacker can then change the query's meaning. The lab app is deliberately vulnerable and runs only on this session's private network. Never try these payloads against a service you do not own or have written permission to test.

## Tasks

1. In the attacker desktop, open `http://sqli/` and read the sample login form and account inventory.
2. Use the provided demo account once to see the normal flow. The sample application displays its training SQL on the page so you can connect input to query structure.
3. On the lab login form only, try the documented boolean-condition payload in the username field. Observe whether the result page demonstrates that the predicate changed the query.
4. Use the local training inventory to confirm there are three fixture accounts. The lab does not permit writes to the training data.
5. Inspect the source in `/app/app.py` from the terminal to find the vulnerable string interpolation and the safe parameterized example.
6. Explain why escaping quotes by hand is fragile and why a parameterized query gives the database a clear code/data boundary.

## Hints

- A login bypass needs the application to accept a true condition, not merely a special character.
- SQL comments have dialect-specific forms; this teaching page uses SQLite's `--` comment syntax.
- A parameterized query looks like `cursor.execute("... WHERE name = ?", (name,))`.

## What you learned

The exploit worked because text from the form became part of SQL syntax. Prepared statements preserve the query structure and bind the submitted text as a value. Production code should also use least-privilege database accounts, avoid returning SQL details, and log security events without logging secrets.
