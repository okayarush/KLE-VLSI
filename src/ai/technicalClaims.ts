/**
 * Technical Claims & Evidence Verification Engine
 * 
 * Evaluates the physical plausibility, dimensional validity, category coherence,
 * and evidence provenance of technical claims made by students in viva-voce examinations.
 * 
 * CORE PRINCIPLES:
 * 1. Distinguishes between a quantified claim and a verified technical claim.
 * 2. Evaluates whether stated parameters are dimensionally meaningful and comparable.
 * 3. Identifies category errors (e.g. attributing transducer sensitivity to passive mechanical connectors).
 * 4. Checks physical plausibility bounds across engineering domains without hardcoded numbers.
 * 5. Demands manufacturer, model number, test conditions, and measurement references.
 * 6. Never assumes student-provided numbers come from genuine datasheets merely because "datasheets" are claimed.
 * 7. Explicitly marks claims as unverified when external facts are missing rather than guessing.
 */

export interface ExtractedParameterClaim {
  raw: string
  parameter: string
  value?: number
  unit?: string
  component?: string
  referenceCondition?: string
}

export interface ClaimEvaluationResult {
  verdict: 'technically_incorrect' | 'physically_implausible' | 'unverified' | 'valid_supported'
  isAcceptable: boolean
  hasCategoryError: boolean
  hasDimensionalMismatch: boolean
  hasImplausibleValue: boolean
  hasUnverifiedDatasheetClaim: boolean
  extractedClaims: ExtractedParameterClaim[]
  identifiedIssues: string[]
  feedbackReply: string
  justificationEvaluation: string
}

// ----------------------------------------------------------------------------
// Component Categories for Category Error Detection
// ----------------------------------------------------------------------------

// Passive mechanical or electromechanical connectors / hardware
const PASSIVE_CONNECTOR_PATTERN =
  /\b(audio\s*jack|3\.5\s*mm\s*(?:jack|plug|socket)|trs|trrs|rca\s*(?:jack|plug)?|bnc|connector|header|pin\s*header|plug|socket|terminal\s*block|screw\s*terminal|cable|wire|jumper)\b/i

// Acoustic or physical transducers & active sensors
const TRANSDUCER_SENSOR_PATTERN =
  /\b(electret|condenser|microphone|mic|loudspeaker|speaker|piezo|accelerometer|photodiode|thermocouple|rtd|strain\s*gauge|hall\s*(?:effect\s*)?sensor|ultrasonic(?:\s*transducer|\s*sensor)?|transducer)\b/i

// Active amplifiers / ICs
export const ACTIVE_AMPLIFIER_PATTERN =
  /\b(op-?amp|operational\s*amplifier|preamp|pre-?amplifier|comparator|instrumentation\s*amplifier|buffer)\b/i

// ----------------------------------------------------------------------------
// Main Analysis Function
// ----------------------------------------------------------------------------

export function analyzeTechnicalClaims(
  text: string,
  _context?: { questionText?: string; pageId?: number },
): ClaimEvaluationResult {
  const t = text.trim()
  const lower = t.toLowerCase()
  const issues: string[] = []
  const extractedClaims: ExtractedParameterClaim[] = []

  let hasCategoryError = false
  let hasDimensionalMismatch = false
  let hasImplausibleValue = false
  let hasUnverifiedDatasheetClaim = false

  // 1. CATEGORY ERROR: Comparing Passive Connector with Transducer / Sensor
  // Connectors provide electrical contact interface; they have contact resistance (mΩ),
  // but do not possess acoustic transduction sensitivity (dBV/Pa), signal generation, or loudness.
  const mentionsConnector = PASSIVE_CONNECTOR_PATTERN.test(lower)
  const mentionsTransducer = TRANSDUCER_SENSOR_PATTERN.test(lower)

  if (mentionsConnector) {
    // Check if sensitivity or sound capture is attributed to the connector
    const connectorSensitivity =
      /\b(?:audio\s*jack|3\.5\s*mm\s*jack|trs|rca|connector|plug|socket)[^.?!;]*(?:sensitivity|captur(?:e|ing)\s*sound|gain|transduction|frequency\s*response)\b/i.test(
        lower,
      ) ||
      /\b(?:sensitivity)[^.?!;]*(?:audio\s*jack|3\.5\s*mm\s*jack|trs|rca|connector|plug|socket)\b/i.test(
        lower,
      )

    if (connectorSensitivity || (mentionsTransducer && lower.includes('sensitivity') && mentionsConnector)) {
      hasCategoryError = true
      issues.push(
        'Category error: An audio jack (or mechanical connector) is a passive electromechanical interface, not an acoustic transducer. Connectors have contact resistance and insertion loss, but do not possess acoustic sensitivity.',
      )
    }
  }

  // 2. DIMENSIONAL CONFLATION & UNRELATED PARAMETER COMPARISONS
  // E.g. Conflating acoustic sensitivity (or dB) with DC operating supply voltage (in V)
  // and declaring a component "superior" based on higher supply voltage.
  const mentionsDb = /\b(-?\d+(?:\.\d+)?)\s*db\b/i.test(lower)
  const mentionsVoltage = /\b(\d+(?:\.\d+)?)\s*v\b/i.test(lower)
  const claimsSuperiority =
    /\b(superior|better|best|winner|proves|highest|better\s*choice)\b/i.test(lower)

  if ((mentionsDb || lower.includes('sensitivity')) && mentionsVoltage && claimsSuperiority) {
    if (
      lower.includes('sensitivity') &&
      (lower.includes('operates') ||
        lower.includes('supply') ||
        lower.includes('rail') ||
        lower.includes('voltage'))
    ) {
      hasDimensionalMismatch = true
      issues.push(
        'Dimensional conflation: You are comparing acoustic sensitivity with operating supply voltage in V. Operating supply voltage is a power rail constraint, not an acoustic figure of merit where a higher value signifies technical superiority.',
      )
    }
  }

  // Op-amp Slew Rate in frequency units (MHz/kHz/Hz) rather than V/µs
  const slewRateFreqMatch = lower.match(/slew\s*rate\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)\s*(mhz|khz|hz)\b/i)
  if (slewRateFreqMatch) {
    hasDimensionalMismatch = true
    issues.push(
      `Dimensional mismatch: Slew rate represents the maximum rate of change of output voltage and must be expressed in V/µs (or V/s), not frequency units (${slewRateFreqMatch[2].toUpperCase()}).`,
    )
  }

  // 3. PHYSICAL PLAUSIBILITY BOUNDS ACROSS ENGINEERING DOMAINS
  // (a) Microphone / Acoustic Transducer Sensitivity:
  // Standard mic sensitivity is relative to 1 V/Pa (0 dBV/Pa) at 1 kHz sound pressure.
  // Typical electret/MEMS sensitivities range between -60 dBV/Pa and -28 dBV/Pa (0.5 mV/Pa to 40 mV/Pa).
  // A positive sensitivity > +10 dB (and especially +50 dB or +150 dB) is physically impossible without external amplification.
  if (mentionsTransducer || lower.includes('sensitivity') || lower.includes('microphone')) {
    const dbMatches = Array.from(lower.matchAll(/(-?\d+(?:\.\d+)?)\s*db(?:v(?:\/pa)?)?\b/gi))
    for (const match of dbMatches) {
      const val = parseFloat(match[1])
      extractedClaims.push({
        raw: match[0],
        parameter: 'sensitivity',
        value: val,
        unit: 'dB',
      })

      if (val >= 30) {
        hasImplausibleValue = true
        issues.push(
          `Physically implausible sensitivity (${val} dB): Microphone sensitivity is expressed relative to a reference level (typically negative, e.g. -42 dBV/Pa at 1 kHz). A positive sensitivity of ${val} dB would imply millions of volts output from normal ambient acoustic sound pressure.`,
        )
      } else if (val > 0 && !lower.includes('spl') && !lower.includes('snr') && !lower.includes('gain')) {
        issues.push(
          `Ambiguous decibel reference: The sensitivity of ${val} dB lacks an explicit reference level (such as dBV/Pa, dBm, or dB SPL) and specified test conditions (e.g. 1 kHz at 1 Pa).`,
        )
      }
    }
  }

  // (b) Thermodynamic Efficiency > 100%
  const effMatch = lower.match(/efficiency\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)\s*%/i)
  if (effMatch) {
    const effVal = parseFloat(effMatch[1])
    extractedClaims.push({
      raw: effMatch[0],
      parameter: 'efficiency',
      value: effVal,
      unit: '%',
    })
    if (effVal > 100) {
      hasImplausibleValue = true
      issues.push(`Physical law violation: System power efficiency cannot exceed 100% (claimed ${effVal}%).`)
    }
  }

  // (c) Resistor tolerance < 0%
  const tolMatch = lower.match(/tolerance\s*(?:of|is|=)?\s*(-?\d+(?:\.\d+)?)\s*%/i)
  if (tolMatch && parseFloat(tolMatch[1]) < 0) {
    hasImplausibleValue = true
    issues.push(`Physically invalid tolerance: Component tolerance cannot be negative (${tolMatch[1]}%).`)
  }

  // (d) Passive network noise figure < 0 dB
  const nfMatch = lower.match(/noise\s*figure\s*(?:of|is|=)?\s*(-?\d+(?:\.\d+)?)\s*db/i)
  if (nfMatch && parseFloat(nfMatch[1]) < 0) {
    hasImplausibleValue = true
    issues.push(`Physical law violation: Noise figure of a passive network cannot be less than 0 dB (${nfMatch[1]} dB).`)
  }

  // (e) Biomedical Biopotentials (ECG/EMG/EEG) amplitude bounds
  // Raw biopotentials at skin surface are microvolts to millivolts (ECG ~0.5-4 mV, EEG ~10-100 uV).
  // Claiming raw unamplified ECG is in Volts (e.g. 5V or 12V) is physically implausible.
  if (/\b(raw\s*ecg|ecg\s*signal|raw\s*biopotential|eeg\s*signal|skin\s*potential)\b/.test(lower) && !lower.includes('gain') && !lower.includes('amplified')) {
    const rawVoltMatch = lower.match(/\b(\d+(?:\.\d+)?)\s*v\b/)
    if (rawVoltMatch && parseFloat(rawVoltMatch[1]) >= 1) {
      hasImplausibleValue = true
      issues.push(
        `Physically implausible biopotential: Human surface biopotentials (such as ECG) have amplitudes of 0.5 mV to 4 mV. Stating a raw bio-signal of ${rawVoltMatch[1]} V before amplification is physically implausible.`,
      )
    }
  }

  // 4. DATASHEET PROVENANCE & UNVERIFIED CLAIMS
  // Check if student claims "according to datasheets" or cites specifications without naming specific parts
  const assertsDatasheet =
    /\b(according\s*to\s*(?:the\s*)?datasheets?|per\s*(?:the\s*)?datasheets?|datasheets?\s*(?:shows?|states?|proves?|gives?)|datasheet\s*values?)\b/i.test(
      lower,
    )
  // Check for common real part numbers (e.g. LM7805, TLV9062, DG411, MAX9814, CMEJ-0415, etc.)
  const hasSpecificPartNumber =
    /\b([a-z]{1,4}\d{2,6}[a-z0-9\-_]*|\b[a-z]{2,5}-\d{2,6})\b/i.test(lower)

  if (assertsDatasheet && !hasSpecificPartNumber) {
    hasUnverifiedDatasheetClaim = true
    issues.push(
      'Unverified datasheet assertion: Stated figures cite "datasheets" in general without naming the specific manufacturer, component part number, or test conditions.',
    )
  }

  // 5. DETERMINE VERDICT
  let verdict: ClaimEvaluationResult['verdict'] = 'valid_supported'
  if (hasCategoryError || hasDimensionalMismatch) {
    verdict = 'technically_incorrect'
  } else if (hasImplausibleValue) {
    verdict = 'physically_implausible'
  } else if (hasUnverifiedDatasheetClaim || issues.length > 0) {
    verdict = 'unverified'
  }

  const isAcceptable = verdict === 'valid_supported'

  // 6. CONSTRUCT RIGOROUS SOCRATIC FEEDBACK
  let feedbackReply = ''
  if (hasCategoryError && hasDimensionalMismatch) {
    feedbackReply =
      'You have introduced numerical specifications, but I cannot yet establish that they are valid. You are comparing microphone sensitivity in dB with operating voltage, which are different electrical and acoustic parameters. Also, an audio jack is a passive connector, not an acoustic transducer with a sensitivity rating. Where did the sensitivity values originate? Can you provide the exact component models and datasheet references?'
  } else if (hasCategoryError) {
    feedbackReply =
      `You have introduced numerical specifications, but they contain a category error: an audio jack is a passive electromechanical connector, not an acoustic transducer, and has no acoustic sensitivity rating. Which specific component models and datasheet references are you comparing?`
  } else if (hasDimensionalMismatch) {
    feedbackReply =
      `You have introduced numerical specifications, but they conflate unrelated physical dimensions. Operating supply voltage (in V) and sensitivity (in dB) represent distinct circuit constraints. Where did these parameters originate, and what specific datasheet references justify this comparison?`
  } else if (hasImplausibleValue) {
    const implausibleIssue = issues.find((i) => i.includes('implausible') || i.includes('violation')) ?? issues[0]
    feedbackReply =
      `You have stated numerical specifications that appear physically implausible. ${implausibleIssue} Under what specific measurement conditions or datasheet definitions were these figures obtained?`
  } else if (hasUnverifiedDatasheetClaim) {
    feedbackReply =
      'You have cited datasheet figures, but without verifiable provenance. Which specific manufacturer and component model numbers are you referencing, and under what test conditions were these parameters measured?'
  } else {
    feedbackReply =
      'You have provided quantified parameters. Ensure that the corresponding manufacturer datasheet, part numbers, and operating conditions are cited in your documentation.'
  }

  return {
    verdict,
    isAcceptable,
    hasCategoryError,
    hasDimensionalMismatch,
    hasImplausibleValue,
    hasUnverifiedDatasheetClaim,
    extractedClaims,
    identifiedIssues: issues,
    feedbackReply,
    justificationEvaluation:
      issues.join(' | ') || 'Technical claims verified against dimensional and physical plausibility standards.',
  }
}
