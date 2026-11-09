import type { MentorQuestion } from '../state/store'

export interface ProgressiveHint {
  level: number
  title: string
  hintText: string
  synthesisPrompt: string
}

/**
 * Returns a 3-tier progressive hint for a struggling student:
 * Tier 1: Conceptual principle (identifies mechanism without giving formula).
 * Tier 2: Mathematical / datasheet relationship.
 * Tier 3: Concrete calculation / substitution prompt.
 */
export function getProgressiveHint(
  question: MentorQuestion,
  currentLevel: number,
): ProgressiveHint {
  const level = Math.max(1, Math.min(3, currentLevel))

  // 1. Check if the question already carries pre-generated scaffolding hints
  const preHints = (question as any).rationale?.scaffoldingHints || (question as any).hints
  if (Array.isArray(preHints) && preHints[level - 1]) {
    return {
      level,
      title: `Hint ${level} of 3 · ${level === 1 ? 'Core Concept' : level === 2 ? 'Governing Relationship' : 'Working Steps'}`,
      hintText: preHints[level - 1],
      synthesisPrompt: 'Take this hint and formulate your engineering explanation in your own words.',
    }
  }

  // 2. Context-aware fallback scaffolding based on question text & topic
  const q = question.text.toLowerCase()

  if (q.includes('bandwidth') || q.includes('gbw') || q.includes('cutoff') || q.includes('frequency')) {
    const hints = [
      'Think about the trade-off between gain and speed in an operational amplifier. Does an amplifier have infinite speed at high gain?',
      'Recall the Gain-Bandwidth Product (GBW) relationship: f_-3dB ≈ GBW / Av. The closed-loop bandwidth shrinks proportionally as gain increases.',
      'Check the manufacturer datasheet for your op-amp’s typical GBW. Divide that GBW by your maximum circuit gain to find your theoretical -3 dB cutoff.',
    ]
    return {
      level,
      title: `Hint ${level} of 3 · Gain-Bandwidth Trade-off`,
      hintText: hints[level - 1],
      synthesisPrompt: 'Explain how your op-amp’s GBW meets or exceeds your requirement.',
    }
  }

  if (q.includes('gain') || q.includes('resistor') || q.includes('rf') || q.includes('rg')) {
    const hints = [
      'Consider the circuit topology (inverting vs non-inverting). How does the feedback network set the transfer function?',
      'Recall the non-inverting gain equation: Av = 1 + (Rf / Rg). Notice how the ratio of feedback to ground resistor governs the amplification factor.',
      'Substitute your target gain into Av = 1 + (Rf / Rg). If Rg is chosen (e.g. 1 kΩ), what value must Rf have to achieve the required output?',
    ]
    return {
      level,
      title: `Hint ${level} of 3 · Op-Amp Gain Network`,
      hintText: hints[level - 1],
      synthesisPrompt: 'Explain how your resistor selections satisfy your gain requirement.',
    }
  }

  if (q.includes('dissipation') || q.includes('thermal') || q.includes('power') || q.includes('regulator')) {
    const hints = [
      'In a linear voltage regulator, what happens to the voltage drop between input and output pins?',
      'The linear regulator drops (Vin - Vout) across its internal pass element. Power dissipation is calculated as Pd = (Vin - Vout) × I_load.',
      'Multiply the voltage drop across the regulator by the maximum expected load current. How many milliwatts or watts must the package dissipate?',
    ]
    return {
      level,
      title: `Hint ${level} of 3 · Thermal Dissipation`,
      hintText: hints[level - 1],
      synthesisPrompt: 'Explain how your design handles the resulting thermal load.',
    }
  }

  if (q.includes('adc') || q.includes('resolution') || q.includes('sampling')) {
    const hints = [
      'Consider the analog voltage range spanned by the ADC and how many discrete digital codes are available.',
      'An N-bit ADC divides the full-scale input voltage range into 2^N discrete quantization levels: LSB step = V_ref / (2^N).',
      'Calculate V_ref / (2^N) for your ADC. Compare that millivolt step size against the smallest signal change your system needs to resolve.',
    ]
    return {
      level,
      title: `Hint ${level} of 3 · Analog-to-Digital Conversion`,
      hintText: hints[level - 1],
      synthesisPrompt: 'Explain whether your ADC quantization step satisfies the sensor resolution need.',
    }
  }

  // Generic 3-tier scaffolding
  const genericHints = [
    'Break down the requirement into its governing physical or electrical principles before looking at specific components.',
    'Identify the governing formula or datasheet specification that connects your input constraints to your desired output target.',
    'State your known numerical values (voltages, currents, tolerances), show how they plug into the relationship, and justify the outcome.',
  ]

  return {
    level,
    title: `Hint ${level} of 3 · Engineering Scaffolding`,
    hintText: genericHints[level - 1],
    synthesisPrompt: 'Summarize your reasoning in your own words using this guidance.',
  }
}
