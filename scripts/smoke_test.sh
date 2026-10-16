#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost}"
COOKIE_JAR="$(mktemp)"
cleanup() { rm -f "$COOKIE_JAR"; }
trap cleanup EXIT

fail() { printf 'FAIL %s\n' "$1" >&2; exit 1; }
pass() { printf 'PASS %s\n' "$1"; }

if [[ "${RUNTIME:-}" != "docker" ]]; then
  printf 'Set RUNTIME=docker in .env before running this smoke test.\n' >&2
  exit 2
fi
command -v curl >/dev/null || fail "curl is required"
command -v docker >/dev/null || fail "Docker CLI is required"
command -v jq >/dev/null || fail "jq is required"
command -v python3 >/dev/null || fail "Python 3 is required"

(cd backend && PYTHONPATH=. python3 -m app.cli labs validate)
curl -fsS "$BASE_URL/healthz" >/dev/null || fail "API health check"
pass "API health and manifests"

curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d '{"email":"student1@cyberrange.local","password":"RangeStudent1!2026"}' \
  "$BASE_URL/api/auth/login" >/dev/null || fail "demo student login"
CSRF="$(curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE_URL/api/auth/csrf" | jq -r .csrf_token)"
[[ -n "$CSRF" && "$CSRF" != "null" ]] || fail "CSRF bootstrap"
LABS="$(curl -fsS -b "$COOKIE_JAR" "$BASE_URL/api/labs")"
EXPECTED=(nmap-network-recon sql-injection password-attacks exploitation-metasploit traffic-forensics firewall-hardening)

for slug in "${EXPECTED[@]}"; do
  LAB_ID="$(jq -r --arg slug "$slug" '.[] | select(.slug == $slug) | .id' <<<"$LABS")"
  [[ -n "$LAB_ID" ]] || fail "$slug is missing from the synced catalog"
  SESSION_JSON="$(curl -fsS -b "$COOKIE_JAR" -H "X-CSRF-Token: $CSRF" -H 'Content-Type: application/json' -d "{\"lab_id\":\"$LAB_ID\"}" "$BASE_URL/api/lab-sessions")" || fail "$slug launch"
  SESSION_ID="$(jq -r .id <<<"$SESSION_JSON")"
  ATTACKER="$(docker ps -q --filter "label=cyberrange.session=$SESSION_ID" | while read -r id; do [[ "$(docker inspect -f '{{.Name}}' "$id")" == *attacker ]] && printf '%s' "$id" && break; done)"
  [[ -n "$ATTACKER" ]] || fail "$slug attacker container missing"
  HTTP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' -b "$COOKIE_JAR" "$BASE_URL/lab/$SESSION_ID/vnc.html")"
  [[ "$HTTP_CODE" == "200" ]] || fail "$slug desktop HTTP status $HTTP_CODE"
  if [[ "$slug" != "traffic-forensics" ]]; then
    TARGET="$(docker ps -q --filter "label=cyberrange.session=$SESSION_ID" | while read -r id; do name="$(docker inspect -f '{{.Name}}' "$id")"; [[ "$name" != *attacker ]] && printf '%s' "$id" && break; done)"
    [[ -n "$TARGET" ]] || fail "$slug target container missing"
    TARGET_NAME="$(docker inspect -f '{{.Config.Hostname}}' "$TARGET")"
    case "$slug" in
      nmap-network-recon) PORTS="21,22,80,9001" ;;
      sql-injection) PORTS="80" ;;
      password-attacks) PORTS="21,22,2323" ;;
      exploitation-metasploit) PORTS="21" ;;
      firewall-hardening) PORTS="22,80,8080" ;;
    esac
    docker exec "$ATTACKER" nmap -Pn --max-retries 1 --host-timeout 20s -p "$PORTS" "$TARGET_NAME" | grep -q 'open' || fail "$slug target not reachable from attacker"
    PUBLISHED="$(docker inspect -f '{{json .NetworkSettings.Ports}}' "$TARGET")"
    [[ "$PUBLISHED" == "null" || "$PUBLISHED" == "{}" || "$PUBLISHED" == *'null'* ]] || fail "$slug target published a host port"
  fi
  if docker exec "$ATTACKER" timeout 4 curl -fsS https://example.com >/dev/null 2>&1; then
    fail "$slug attacker has internet egress"
  fi
  curl -fsS -b "$COOKIE_JAR" -X POST -H "X-CSRF-Token: $CSRF" "$BASE_URL/api/lab-sessions/$SESSION_ID/stop" >/dev/null || fail "$slug cleanup request"
  for _ in {1..20}; do
    [[ -z "$(docker ps -q --filter "label=cyberrange.session=$SESSION_ID")" ]] && break
    sleep 1
  done
  [[ -z "$(docker ps -q --filter "label=cyberrange.session=$SESSION_ID")" ]] || fail "$slug containers were not cleaned up"
  pass "$slug isolated launch, desktop, and cleanup"
done
