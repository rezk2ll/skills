// Runs with no dependencies:
//   node --experimental-strip-types test/detect.test.mts
//
// The lists below are the whole contract. A change to a threshold or a
// pattern is only finished when they all still pass.
//
// Every value here is fake: documented example keys, zero-filled tokens,
// RFC 2606 domains and RFC 5737 / RFC 3849 addresses.
import { makeConfig, scrubSecrets, scrubPii, restore } from '../hooks/redact.ts'

const cfg = makeConfig({})
const scrub = (text: string): string => scrubPii(scrubSecrets(text, cfg), cfg)

const strict = makeConfig({ redactPrivateIps: true })
const scrubStrict = (text: string): string => scrubPii(scrubSecrets(text, strict), strict)

const HIDE: readonly string[] = [
  'ANTHROPIC_API_KEY=sk-ant-test-0000000000000000000000EXAMPLE',
  'export GITHUB_TOKEN=ghp_EXAMPLE00000000000000000000000000000',
  'aws_access_key_id = AKIAEXAMPLE000000000',
  'STRIPE_SECRET=sk_test_EXAMPLE0000000000000000',
  'db: postgres://app:not-a-real-password@db.example.com:5432/main',
  'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJleGFtcGxlIn0.ZmFrZS1zaWduYXR1cmU',
  'R2_SECRET_ACCESS_KEY="aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3a"',
  'a bare high-entropy token aB1cD2eF3gH4aB1cD2eF3gH4kL5mN6 here',
  'AIzaSyEXAMPLE-fake-key-000000000000000000',
  '-----BEGIN RSA PRIVATE KEY-----\nEXAMPLE-NOT-A-REAL-KEY\n-----END RSA PRIVATE KEY-----',
  'contact me at dana@northwind.example',
  'v6 2001:0db8:85a3:0000:0000:8a2e:0370:7334 seen',
]

// Documentation ranges stay visible by default, so they are only hidden
// when redactPrivateIps is on.
const HIDE_STRICT: readonly string[] = [
  'origin 198.51.100.23 hit the worker',
  'gateway 192.0.2.1',
]

const KEEP: readonly string[] = [
  'commit 79a1e9dd8f3b2c1a4e5d6f7089abcdef01234567 landed on main',
  'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'apps/web/src/components/checkout/checkout-styles.ts',
  'http://localhost:3000/api/auth and 127.0.0.1:5432',
  'private net 192.168.1.14 and 10.0.0.7 and 172.16.4.2 and 203.0.113.9',
  'docs range 198.51.100.23 and 192.0.2.1',
  'Co-Authored-By: Claude <noreply@anthropic.com>',
  'someone@users.noreply.github.com',
  'Claude Code 2.1.260 released 2026-09-04',
  'const IN_FLIGHT = new Set([QUEUED, BUILDING, INITIALIZING])',
  'npm install @anthropic-ai/claude-code --save-dev',
  'DATABASE_URL is set in the prod secret store',
  // Stripe hands these out in public. Hiding them protects nothing.
  'monthly: "price_EXAMPLE0000000000000000", productId: "prod_EXAMPLE000000"',
  'only promo_EXAMPLE00000000000000 is active',
  'pk_live_EXAMPLE000000000000000000000000',
  // Names, not keys.
  'key="archived-modules-marker"',
  'const OUTLINE_OPEN_KEY = "lesson_article_outline_open_v1";',
  'import { playerEventBatchV1Schema } from "./player-event-ingest";',
  'export function randomTimestampWithinLast14Days(): string {',
  'META_Conv_Lookalike-Customers_FreeTrial_2024Q1',
  'const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";',
  'utm_source=youtube&utm_medium=video_description&utm_campaign=dQw4w9WgXcQ',
  'The channel ID is UCEXAMPLEchannelId000000 (a channel)',
  'placeholder="you@example.com" and name@company.com',
]

let bad = 0
const miss = (text: string, out: string): void => {
  if (out === text) {
    bad++
    console.log(`MISS  ${text.split('\n')[0].slice(0, 100)}`)
  }
}
for (const text of HIDE) miss(text, scrub(text))
for (const text of HIDE_STRICT) miss(text, scrubStrict(text))
for (const text of KEEP) {
  const out = scrub(text)
  if (out !== text) {
    bad++
    console.log(`FALSE POSITIVE  ${out.slice(0, 120)}`)
  }
}

// A value always mints the same placeholder, and the placeholder always
// buys the value back.
const line = 'KEY=sk-ant-test-0000000000000000000000EXAMPLE'
if (scrub(line) !== scrub(line)) {
  bad++
  console.log('DRIFT  the same value minted two placeholders')
}
if (restore(scrub(line)) !== line) {
  bad++
  console.log('LOSS  a placeholder did not buy its value back')
}

const hidden = HIDE.length + HIDE_STRICT.length
console.log(bad === 0 ? `ok  ${hidden} hidden, ${KEEP.length} kept, round trip clean` : `${bad} failure(s)`)
if (bad > 0) process.exitCode = 1
