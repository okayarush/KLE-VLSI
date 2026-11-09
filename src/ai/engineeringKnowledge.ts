/**
 * ECE Engineering Knowledge & Modular Calculation Registry
 * 
 * Separates strict deterministic calculations from LLM-based qualitative reasoning.
 * CRITICAL RULE: Never claim comprehensive engineering verification when only a
 * limited set of formulas is supported. If a calculation is outside the supported
 * domain, flag it explicitly with 'unsupported' confidence.
 * 
 * Reusable architecture:
 * 1. Dimensional analysis and metric prefix normalizer (p, n, µ, m, k, M, G).
 * 2. Extensible ECE calculation registry covering Analog, Digital, Embedded, Power, DSP, RF.
 * 3. Transparent, pedagogical calculation verification with discrepancy tracking.
 */

import type { EceSubDomain } from './types'

export interface CalculationCheckResult {
  supported: boolean
  domain?: string
  ruleId?: string
  isMathematicallyValid?: boolean
  expectedValue?: string
  studentCalculatedValue?: string
  discrepancyPercent?: number
  explanation: string
  confidence: 'high' | 'low' | 'unsupported'
}

// ----------------------------------------------------------------------------
// 1. Dimensional Analysis & Engineering Unit Parser
// ----------------------------------------------------------------------------

export interface ParsedValue {
  num: number
  unit: string
  prefix: string
  baseUnit: string
}

/** Parses engineering strings with scientific/metric prefixes into standard SI units. */
export function parseEngineeringValue(str: string): { num: number; unit: string } | null {
  if (!str || typeof str !== 'string') return null
  const trimmed = str.trim()
  const match = trimmed.match(/^([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*([a-zA-ZΩµ%]*)/)
  if (!match) return null

  let num = parseFloat(match[1])
  let unit = match[2] || ''

  if (unit.startsWith('p')) {
    num *= 1e-12
    unit = unit.slice(1)
  } else if (unit.startsWith('n')) {
    num *= 1e-9
    unit = unit.slice(1)
  } else if (unit.startsWith('u') || unit.startsWith('µ')) {
    num *= 1e-6
    unit = unit.slice(1)
  } else if (unit.startsWith('m') && !unit.startsWith('meg') && !unit.startsWith('mol') && !unit.startsWith('mhz')) {
    num *= 1e-3
    unit = unit.slice(1)
  } else if (unit.startsWith('k') || unit.startsWith('K')) {
    num *= 1e3
    unit = unit.slice(1)
  } else if (unit.startsWith('M') && !unit.startsWith('mV') && !unit.startsWith('mA') && !unit.startsWith('ms')) {
    num *= 1e6
    unit = unit.slice(1)
  } else if (unit.startsWith('G')) {
    num *= 1e9
    unit = unit.slice(1)
  }

  return { num, unit }
}

export function formatEngineeringValue(val: number, unit: string, decimals = 2): string {
  const abs = Math.abs(val)
  if (abs === 0) return `0 ${unit}`
  if (abs >= 1e9) return `${(val / 1e9).toFixed(decimals)} G${unit}`
  if (abs >= 1e6) return `${(val / 1e6).toFixed(decimals)} M${unit}`
  if (abs >= 1e3) return `${(val / 1e3).toFixed(decimals)} k${unit}`
  if (abs >= 1) return `${val.toFixed(decimals)} ${unit}`
  if (abs >= 1e-3) return `${(val * 1e3).toFixed(decimals)} m${unit}`
  if (abs >= 1e-6) return `${(val * 1e6).toFixed(decimals)} µ${unit}`
  if (abs >= 1e-9) return `${(val * 1e9).toFixed(decimals)} n${unit}`
  return `${(val * 1e12).toFixed(decimals)} p${unit}`
}

// ----------------------------------------------------------------------------
// 2. Modular ECE Calculation Rule Definition
// ----------------------------------------------------------------------------

export interface EceCalculationRule {
  id: string
  name: string
  domain: EceSubDomain
  isTriggered: (text: string) => boolean
  evaluate: (text: string) => CalculationCheckResult | null
}

export const ECE_CALCULATION_RULES: EceCalculationRule[] = [
  // --------------------------------------------------------------------------
  // Rule 1: Gain-Bandwidth Product (GBW): f-3dB = GBW / Av
  // --------------------------------------------------------------------------
  {
    id: 'gbw_cutoff',
    name: 'Gain-Bandwidth Product (GBW)',
    domain: 'analog_circuits',
    isTriggered: (t) =>
      (t.includes('gbw') || t.includes('gain-bandwidth')) &&
      (t.includes('bandwidth') || t.includes('gain') || t.includes('cutoff') || t.includes('f-3db')),
    evaluate: (t) => {
      const gbwMatch =
        t.match(/(\d+(?:\.\d+)?)\s*(mhz|khz|hz)?\s*(?:gbw|gain-bandwidth)/i) ||
        t.match(/(?:gbw|gain-bandwidth)[^\d]*(\d+(?:\.\d+)?)\s*(mhz|khz|hz)?/i)
      const gainMatch =
        t.match(/(?:gain|av)[^\d]*(\d+(?:\.\d+)?)/i) ||
        t.match(/(\d+(?:\.\d+)?)\s*(?:v\/v|times|x|gain)/i)

      if (!gbwMatch || !gainMatch) return null

      let gbw = parseFloat(gbwMatch[1])
      const gbwUnit = gbwMatch[2]?.toLowerCase() || 'mhz'
      if (gbwUnit === 'khz') gbw /= 1000
      if (gbwUnit === 'hz') gbw /= 1e6

      const gain = parseFloat(gainMatch[1])
      if (gain <= 0) return null

      const expectedBwMhz = gbw / gain
      const bwClaimMatch =
        t.match(/=\s*(\d+(?:\.\d+)?)\s*(mhz|khz|hz)\s*$/i) ||
        t.match(/(?:=|is|gives)\s*(\d+(?:\.\d+)?)\s*(mhz|khz|hz)/i) ||
        t.match(/(?:bandwidth|f-3db|cutoff)[^\d]*(\d+(?:\.\d+)?)\s*(mhz|khz|hz)?/i)

      if (!bwClaimMatch) return null

      let claimedBw = parseFloat(bwClaimMatch[1])
      const claimedUnit = bwClaimMatch[2]?.toLowerCase() || 'mhz'
      if (claimedUnit === 'khz') claimedBw /= 1000
      if (claimedUnit === 'hz') claimedBw /= 1e6

      const ratio = claimedBw / expectedBwMhz
      const isCorrect = ratio >= 0.85 && ratio <= 1.15
      const discrepancy = Math.abs(1 - ratio) * 100

      const displayExpected = expectedBwMhz >= 1 ? `${expectedBwMhz.toFixed(2)} MHz` : `${(expectedBwMhz * 1000).toFixed(1)} kHz`

      return {
        supported: true,
        ruleId: 'gbw_cutoff',
        domain: 'Gain-Bandwidth Product (GBW)',
        isMathematicallyValid: isCorrect,
        expectedValue: displayExpected,
        studentCalculatedValue: `${bwClaimMatch[1]} ${claimedUnit}`,
        discrepancyPercent: discrepancy,
        explanation: isCorrect
          ? `Bandwidth calculation f-3dB = GBW / Av = ${gbw} MHz / ${gain} = ${displayExpected} is mathematically correct.`
          : `Bandwidth calculation error: For GBW = ${gbw} MHz and Gain = ${gain}, f-3dB must be GBW / Av = ${displayExpected}, but student claimed ${claimedBw} MHz (likely multiplied instead of divided).`,
        confidence: 'high',
      }
    },
  },

  // --------------------------------------------------------------------------
  // Rule 2: Non-Inverting Op-Amp Gain: Av = 1 + Rf / Rg
  // --------------------------------------------------------------------------
  {
    id: 'opamp_non_inverting_gain',
    name: 'Non-Inverting Op-Amp Gain',
    domain: 'analog_circuits',
    isTriggered: (t) =>
      (t.includes('non-inverting') || t.includes('non inverting') || t.includes('1 + rf')) &&
      t.includes('rf') &&
      t.includes('rg'),
    evaluate: (t) => {
      const rfMatch = t.match(/rf\s*=\s*(\d+(?:\.\d+)?)\s*(k|m|ohm|ω)?/i)
      const rgMatch = t.match(/rg\s*=\s*(\d+(?:\.\d+)?)\s*(k|m|ohm|ω)?/i)
      const avMatch = t.match(/(?:gain|av)\s*=\s*(\d+(?:\.\d+)?)/i)

      if (!rfMatch || !rgMatch) return null

      let rf = parseFloat(rfMatch[1])
      if (rfMatch[2]?.toLowerCase() === 'k') rf *= 1000
      let rg = parseFloat(rgMatch[1])
      if (rgMatch[2]?.toLowerCase() === 'k') rg *= 1000

      if (rg <= 0) return null
      const expectedAv = 1 + rf / rg

      if (!avMatch) return null
      const claimedAv = parseFloat(avMatch[1])
      const isCorrect = Math.abs(claimedAv - expectedAv) / expectedAv < 0.05

      return {
        supported: true,
        ruleId: 'opamp_non_inverting_gain',
        domain: 'Non-Inverting Op-Amp Gain',
        isMathematicallyValid: isCorrect,
        expectedValue: `${expectedAv.toFixed(2)} V/V`,
        studentCalculatedValue: `${claimedAv} V/V`,
        discrepancyPercent: (Math.abs(claimedAv - expectedAv) / expectedAv) * 100,
        explanation: isCorrect
          ? `Gain formula Av = 1 + Rf/Rg = 1 + ${rf}/${rg} = ${expectedAv.toFixed(2)} is verified.`
          : `Gain calculation error: 1 + Rf/Rg = 1 + ${rf}/${rg} = ${expectedAv.toFixed(2)}, not ${claimedAv}.`,
        confidence: 'high',
      }
    },
  },

  // --------------------------------------------------------------------------
  // Rule 3: Linear Regulator Power Dissipation: Pd = (Vin - Vout) * Iload
  // --------------------------------------------------------------------------
  {
    id: 'regulator_power_dissipation',
    name: 'Linear Regulator Power Dissipation',
    domain: 'power_electronics',
    isTriggered: (t) =>
      (t.includes('regulator') || t.includes('lm78') || t.includes('dissipation') || t.includes('pd')) &&
      t.includes('vin') &&
      t.includes('vout'),
    evaluate: (t) => {
      const vinMatch = t.match(/vin\s*=\s*(\d+(?:\.\d+)?)\s*v/i)
      const voutMatch = t.match(/vout\s*=\s*(\d+(?:\.\d+)?)\s*v/i)
      const iMatch = t.match(/(?:iload|i|current)\s*=\s*(\d+(?:\.\d+)?)\s*(ma|a)/i)
      const pdMatch = t.match(/(?:pd|power|dissipation)\s*=\s*(\d+(?:\.\d+)?)\s*(mw|w)/i)

      if (!vinMatch || !voutMatch || !iMatch || !pdMatch) return null

      const vin = parseFloat(vinMatch[1])
      const vout = parseFloat(voutMatch[1])
      let iload = parseFloat(iMatch[1])
      if (iMatch[2]?.toLowerCase() === 'ma') iload /= 1000

      let claimedPd = parseFloat(pdMatch[1])
      if (pdMatch[2]?.toLowerCase() === 'mw') claimedPd /= 1000

      const expectedPd = (vin - vout) * iload
      if (expectedPd < 0) return null

      const isCorrect = Math.abs(claimedPd - expectedPd) / (expectedPd || 1) < 0.1

      return {
        supported: true,
        ruleId: 'regulator_power_dissipation',
        domain: 'Regulator Power Dissipation',
        isMathematicallyValid: isCorrect,
        expectedValue: `${expectedPd.toFixed(3)} W`,
        studentCalculatedValue: `${claimedPd} W`,
        discrepancyPercent: (Math.abs(claimedPd - expectedPd) / (expectedPd || 1)) * 100,
        explanation: isCorrect
          ? `Pd = (Vin - Vout) * I = (${vin}V - ${vout}V) * ${iload}A = ${expectedPd.toFixed(3)} W is correct.`
          : `Power dissipation error: (${vin}V - ${vout}V) * ${iload}A = ${expectedPd.toFixed(3)} W, but student calculated ${claimedPd} W.`,
        confidence: 'high',
      }
    },
  },

  // --------------------------------------------------------------------------
  // Rule 4: ADC Voltage Resolution: Vlsb = Vref / 2^N
  // --------------------------------------------------------------------------
  {
    id: 'adc_lsb_step',
    name: 'ADC Quantization Step (LSB)',
    domain: 'signal_processing',
    isTriggered: (t) =>
      (t.includes('adc') || t.includes('resolution') || t.includes('lsb')) &&
      (t.includes('bit') || t.includes('12-bit') || t.includes('10-bit') || t.includes('16-bit')),
    evaluate: (t) => {
      const bitsMatch = t.match(/(\d+)\s*-?\s*bit/i)
      const vrefMatch = t.match(/(?:vref|range|voltage)[^\d]*(\d+(?:\.\d+)?)\s*v/i)

      // Look specifically for the LSB result (prioritize mV or µV, or after '=' at end)
      const lsbMatch =
        t.match(/(?:lsb|step|gives|resolution)[^=\d]*=\s*(\d+(?:\.\d+)?)\s*(mv|uv|v)\s*$/i) ||
        t.match(/=\s*(\d+(?:\.\d+)?)\s*(mv|uv|v)\s*$/i) ||
        t.match(/(\d+(?:\.\d+)?)\s*(mv|uv)\b/i) ||
        t.match(/(?:lsb|step)[^\d]*(\d+(?:\.\d+)?)\s*(mv|uv|v)/i)

      if (!bitsMatch || !vrefMatch || !lsbMatch) return null

      const bits = parseInt(bitsMatch[1], 10)
      if (bits <= 0 || bits > 32) return null
      const vref = parseFloat(vrefMatch[1])

      let claimedLsb = parseFloat(lsbMatch[1])
      if (lsbMatch[2]?.toLowerCase() === 'mv') claimedLsb *= 1e-3
      if (lsbMatch[2]?.toLowerCase() === 'uv') claimedLsb *= 1e-6

      const expectedLsb = vref / Math.pow(2, bits)
      const isCorrect = Math.abs(claimedLsb - expectedLsb) / expectedLsb < 0.1

      return {
        supported: true,
        ruleId: 'adc_lsb_step',
        domain: 'ADC Resolution',
        isMathematicallyValid: isCorrect,
        expectedValue: `${(expectedLsb * 1000).toFixed(3)} mV`,
        studentCalculatedValue: `${(claimedLsb * 1000).toFixed(3)} mV`,
        discrepancyPercent: (Math.abs(claimedLsb - expectedLsb) / expectedLsb) * 100,
        explanation: isCorrect
          ? `LSB step = Vref / 2^${bits} = ${vref}V / ${Math.pow(2, bits)} = ${(expectedLsb * 1000).toFixed(3)} mV is verified.`
          : `ADC resolution error: ${vref}V / 2^${bits} = ${(expectedLsb * 1000).toFixed(3)} mV, but student claimed ${(claimedLsb * 1000).toFixed(3)} mV.`,
        confidence: 'high',
      }
    },
  },

  // --------------------------------------------------------------------------
  // Rule 5: RC Filter Cutoff Frequency: fc = 1 / (2 * pi * R * C)
  // --------------------------------------------------------------------------
  {
    id: 'rc_filter_cutoff',
    name: 'RC Filter Cutoff Frequency',
    domain: 'analog_circuits',
    isTriggered: (t) =>
      (t.includes('filter') || t.includes('cutoff') || t.includes('fc') || t.includes('low-pass') || t.includes('high-pass')) &&
      (t.includes('1/(2*pi') || (t.includes('r =') && t.includes('c =')) || (t.includes('r=') && t.includes('c='))),
    evaluate: (t) => {
      const rMatch = t.match(/r\s*=\s*(\d+(?:\.\d+)?)\s*(k|m|ohm|ω)?/i)
      const cMatch = t.match(/c\s*=\s*(\d+(?:\.\d+)?)\s*(u|µ|n|p|f)?/i)

      // Look for cutoff result (handles 'fc = 1/(2*pi*R*C) = 1.59 kHz' or 'fc = 1.59 kHz')
      const fcMatch =
        t.match(/=\s*(\d+(?:\.\d+)?)\s*(khz|mhz|hz)\s*$/i) ||
        t.match(/(?:fc|cutoff|frequency)[^=\d]*=\s*(?:[^\d=]*=)?\s*(\d+(?:\.\d+)?)\s*(khz|mhz|hz)/i) ||
        t.match(/(?:fc|cutoff|frequency)[^\d]*(\d+(?:\.\d+)?)\s*(khz|mhz|hz)/i)

      if (!rMatch || !cMatch || !fcMatch) return null

      let r = parseFloat(rMatch[1])
      if (rMatch[2]?.toLowerCase() === 'k') r *= 1e3
      if (rMatch[2]?.toLowerCase() === 'm') r *= 1e6

      let c = parseFloat(cMatch[1])
      const cUnit = cMatch[2]?.toLowerCase() || 'u'
      if (cUnit === 'u' || cUnit === 'µ') c *= 1e-6
      else if (cUnit === 'n') c *= 1e-9
      else if (cUnit === 'p') c *= 1e-12

      if (r <= 0 || c <= 0) return null
      const expectedFc = 1 / (2 * Math.PI * r * c)

      let claimedFc = parseFloat(fcMatch[1])
      const fcUnit = fcMatch[2]?.toLowerCase() || 'hz'
      if (fcUnit === 'khz') claimedFc *= 1e3
      if (fcUnit === 'mhz') claimedFc *= 1e6

      const isCorrect = Math.abs(claimedFc - expectedFc) / expectedFc < 0.15

      const displayExpected = expectedFc >= 1e3 ? `${(expectedFc / 1e3).toFixed(2)} kHz` : `${expectedFc.toFixed(1)} Hz`
      const displayClaimed = claimedFc >= 1e3 ? `${(claimedFc / 1e3).toFixed(2)} kHz` : `${claimedFc.toFixed(1)} Hz`

      return {
        supported: true,
        ruleId: 'rc_filter_cutoff',
        domain: 'RC Filter Cutoff',
        isMathematicallyValid: isCorrect,
        expectedValue: displayExpected,
        studentCalculatedValue: displayClaimed,
        discrepancyPercent: (Math.abs(claimedFc - expectedFc) / expectedFc) * 100,
        explanation: isCorrect
          ? `Cutoff fc = 1 / (2 * π * R * C) = 1 / (2 * π * ${r} * ${c}) = ${displayExpected} is correct.`
          : `Filter cutoff error: 1 / (2 * π * ${r} * ${c}) gives ${displayExpected}, not ${displayClaimed}.`,
        confidence: 'high',
      }
    },
  },

  // --------------------------------------------------------------------------
  // Rule 6: Antenna Monopole / Dipole Length: L = c / (4f) or c / (2f)
  // --------------------------------------------------------------------------
  {
    id: 'quarter_wave_antenna',
    name: 'Quarter-Wave Antenna Length',
    domain: 'antennas',
    isTriggered: (t) =>
      (t.includes('antenna') || t.includes('monopole') || t.includes('patch') || t.includes('wavelength') || t.includes('lambda')) &&
      (t.includes('ghz') || t.includes('mhz')),
    evaluate: (t) => {
      const freqMatch = t.match(/(\d+(?:\.\d+)?)\s*(ghz|mhz)/i)
      const lenMatch = t.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m)\b/i)

      if (!freqMatch || !lenMatch) return null

      let freqHz = parseFloat(freqMatch[1])
      if (freqMatch[2].toLowerCase() === 'ghz') freqHz *= 1e9
      else if (freqMatch[2].toLowerCase() === 'mhz') freqHz *= 1e6

      const c = 3e8 // m/s
      const lambda = c / freqHz
      const expectedQuarterWaveMm = (lambda / 4) * 1000

      let claimedMm = parseFloat(lenMatch[1])
      if (lenMatch[2].toLowerCase() === 'cm') claimedMm *= 10
      if (lenMatch[2].toLowerCase() === 'm') claimedMm *= 1000

      // Allow 20% margin for dielectric substrate shortening
      const isQuarterWave = Math.abs(claimedMm - expectedQuarterWaveMm) / expectedQuarterWaveMm < 0.25

      return {
        supported: true,
        ruleId: 'quarter_wave_antenna',
        domain: 'Antenna & RF Wavelength',
        isMathematicallyValid: isQuarterWave,
        expectedValue: `λ/4 ≈ ${expectedQuarterWaveMm.toFixed(1)} mm (in air)`,
        studentCalculatedValue: `${claimedMm.toFixed(1)} mm`,
        discrepancyPercent: (Math.abs(claimedMm - expectedQuarterWaveMm) / expectedQuarterWaveMm) * 100,
        explanation: isQuarterWave
          ? `Antenna dimension λ/4 at ${freqMatch[0]} = (3e8 / (4 * ${freqHz})) = ${expectedQuarterWaveMm.toFixed(1)} mm is theoretically valid (adjusting for dielectric loading).`
          : `Antenna dimension discrepancy: Quarter-wavelength λ/4 in air at ${freqMatch[0]} is ${expectedQuarterWaveMm.toFixed(1)} mm, but student stated ${claimedMm.toFixed(1)} mm.`,
        confidence: 'high',
      }
    },
  },
]

// ----------------------------------------------------------------------------
// 3. Central Deterministic Checking Entrypoint
// ----------------------------------------------------------------------------

export function checkDeterministicCalculation(
  text: string,
  _context?: { pageId?: number; questionText?: string },
): CalculationCheckResult {
  const t = text.toLowerCase()

  for (const rule of ECE_CALCULATION_RULES) {
    if (rule.isTriggered(t)) {
      const result = rule.evaluate(t)
      if (result) return result
    }
  }

  // Fallback for unsupported / open-ended calculations
  return {
    supported: false,
    explanation:
      'Calculation falls outside deterministic algebra checks. Requires model-assisted engineering reasoning and datasheet verification.',
    confidence: 'unsupported',
  }
}
