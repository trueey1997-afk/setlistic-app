import type { MusicalKey } from './types'

const LETTERS = 'CDEFGAB'
const LETTER_PITCH = [0, 2, 4, 5, 7, 9, 11]

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11]
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10] // natural minor
const MAJOR_QUALITY = ['', 'm', 'm', '', '', 'm', 'dim']
const MINOR_QUALITY = ['m', 'dim', '', 'm', 'm', '', '']
const MAJOR_DEGREE = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
const MINOR_DEGREE = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']
/** I, IV and V: the three chords most songs in the key are built on. */
const PRIMARY = new Set([0, 3, 4])

/** Keys whose chords would need E#/B# or double sharps; written with their flat twin instead. */
const RESPELL: Partial<Record<MusicalKey, MusicalKey>> = {
  'D#': 'Eb',
  'G#': 'Ab',
  'A#': 'Bb',
  'A#m': 'Bbm'
}

export interface ScaleChord {
  /** Roman numeral, e.g. "IV" or "ii°". */
  degree: string
  name: string
  primary: boolean
}

export interface KeyChords {
  chords: ScaleChord[]
  /** Set when the key is written with an easier enharmonic name, e.g. D# -> Eb. */
  spelledAs?: string
  /** Minor keys: the major V (e.g. E in Am) that songs usually use instead of the minor v. */
  dominant?: string
}

/** Note on scale degree `degree` from `root`, spelled with the right letter (C -> E, not Fb). */
function spell(rootLetter: number, rootPitch: number, degree: number, steps: number[]): string {
  const letter = (rootLetter + degree) % 7
  const pitch = (rootPitch + steps[degree]) % 12
  const diff = (pitch - LETTER_PITCH[letter] + 12) % 12 // 0, 1, 2 sharp-ish; 11, 10 flat-ish
  const accidental = diff === 0 ? '' : diff <= 2 ? '#'.repeat(diff) : 'b'.repeat(12 - diff)
  return LETTERS[letter] + accidental
}

/** The seven diatonic triads of a key, with I/IV/V (i/iv/v in minor) marked as primary. */
export function chordsInKey(key: MusicalKey): KeyChords {
  const spelled = RESPELL[key] ?? key
  const minor = spelled.endsWith('m')
  const root = minor ? spelled.slice(0, -1) : spelled

  const rootLetter = LETTERS.indexOf(root[0])
  const rootPitch =
    (LETTER_PITCH[rootLetter] + (root[1] === '#' ? 1 : root[1] === 'b' ? -1 : 0) + 12) % 12
  const steps = minor ? MINOR_STEPS : MAJOR_STEPS
  const quality = minor ? MINOR_QUALITY : MAJOR_QUALITY
  const degree = minor ? MINOR_DEGREE : MAJOR_DEGREE

  const chords = steps.map((_, i) => ({
    degree: degree[i],
    name: spell(rootLetter, rootPitch, i, steps) + quality[i],
    primary: PRIMARY.has(i)
  }))

  return {
    chords,
    spelledAs: spelled !== key ? spelled : undefined,
    dominant: minor ? spell(rootLetter, rootPitch, 4, steps) : undefined
  }
}
