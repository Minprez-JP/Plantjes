import {
  EDIBILITY_OPTIONS,
  ENVIRONMENTS,
  FERTILIZER_TYPE_OPTIONS,
  LIGHT_OPTIONS,
  SOIL_COMPOSITION_OPTIONS,
  SOIL_DRAINAGE_OPTIONS,
  SOIL_PH_OPTIONS,
  TOXICITY_OPTIONS,
} from '../constants'

/** Fixed seed shared by every generated corpus so CI is reproducible. */
export const FUZZ_SEED = 0x504c414e54
export const FUZZ_ITERATIONS = 240
export const FIXED_NOW = new Date('2026-06-15T12:34:56.789Z')

/** Small deterministic PRNG (mulberry32). */
export function createRandom(seed = FUZZ_SEED) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let next = state
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

export function randomInt(random: () => number, min: number, max: number) {
  return min + Math.floor(random() * (max - min + 1))
}

export function randomPick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)]
}

const HOSTILE_FRAGMENTS = [
  'a',
  'Z',
  ' ',
  '\n',
  '\r',
  '\t',
  'é',
  '🙃',
  '\u0000',
  '\u202e',
  '"',
  "'",
  '\\',
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'https://cdn.example.com/app.js',
]

/** Length-bounded text containing script-like, control and Unicode fragments. */
export function hostileText(random: () => number, maxLength = 300) {
  let text = ''
  const target = randomInt(random, 0, maxLength)
  while (text.length < target) text += randomPick(random, HOSTILE_FRAGMENTS)
  return text.slice(0, target)
}

/** Script-like text without NUL, so location/name validation can still accept it. */
export function readableText(random: () => number, maxLength: number, fallback: string) {
  const text = hostileText(random, maxLength).replace('\u0000', '')
  return text.trim() ? text : fallback
}

/** Integer-like tokens plus coercive values that must be rejected. */
export function numericToken(random: () => number) {
  return randomPick(random, [
    '',
    '0',
    '1',
    '7',
    '365',
    '366',
    '-1',
    '2.5',
    '1e2',
    '0x10',
    '  12  ',
    'Infinity',
    'NaN',
    String(randomInt(random, -200, 500)),
  ])
}

export function selectTokens<T extends string>(allowed: readonly T[]): readonly string[] {
  return [...allowed, '', 'Moonlight', 'Unknown', 'ADMIN', '<script>']
}

export const FUZZ_SELECTS = {
  environment: selectTokens(ENVIRONMENTS),
  edibility: selectTokens(EDIBILITY_OPTIONS),
  toxicity: selectTokens(TOXICITY_OPTIONS),
  fertilizerType: selectTokens(FERTILIZER_TYPE_OPTIONS),
  light: selectTokens(LIGHT_OPTIONS),
  soilDrainage: selectTokens(SOIL_DRAINAGE_OPTIONS),
  soilComposition: selectTokens(SOIL_COMPOSITION_OPTIONS),
  soilPh: selectTokens(SOIL_PH_OPTIONS),
}
