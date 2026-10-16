# Password auditing: online and offline risk

## Learning objectives

Distinguish online guessing from offline hash auditing, understand why weak credentials are dangerous, and recommend controls that reduce risk without disrupting users.

## The idea

Online password attacks send guesses to a live authentication service. They can be detected, rate-limited, or locked out, but can disrupt legitimate users. Offline auditing tests stolen password hashes on an auditor's own machine. A fast unsalted hash lets attackers test guesses cheaply; modern memory-hard password hashing increases the cost of each guess. This exercise contains disposable credentials and synthetic hashes only.

## Tasks

1. Read `~/range/hashes.txt` and identify its format. The file is a synthetic teaching fixture, not production data.
2. Run John against that local fixture using the installed small lab wordlist: `john --wordlist=/usr/share/wordlists/rockyou.txt ~/range/hashes.txt`.
3. Show the results with `john --show ~/range/hashes.txt`. Record how many fixture hashes were recoverable and why that result does not tell you whether any real account is compromised.
4. Connect only to the named target `weak-auth` with the lab-only account `student` / `RangeStudent!26`. Run `nc weak-auth 2323` to read the welcome message and capture this session's flag.
5. Discuss with your instructor how online rate limits, breached-password screening, MFA or passkeys, and Argon2id protect different parts of the authentication lifecycle.

## Hints

- Use only the supplied hash fixture with offline tools. Never put real user hashes into a public cracking service.
- Hydra is available for instructor-authorized demonstrations, but do not use it outside this isolated target.
- A longer unique passphrase is generally more resistant to guessing than a short word with predictable substitutions.

## What you learned

Online and offline attacks have different detection and disruption characteristics. Use MFA, throttling, breached-password checks, secure password hashing, and incident response together. Get written authorization and coordinate account lockout thresholds before any real assessment.
