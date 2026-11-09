import type { PageDef } from '../data/pages'
import type { Content } from '../lib/progress'
import type {
  ArchitectureBlockItem,
  BomItem,
  CalculationCardItem,
  ConceptAlternativeItem,
  DebugItem,
  DesignInputItem,
  EceSubDomain,
  FunctionalRequirementItem,
  InterdisciplinaryDomain,
  PowerTreeSummary,
  ProjectDigest,
  SignalChainNode,
  SignalChainSummary,
  StructuredProject,
  ValidationItem,
} from './types'

const safeStr = (val: unknown): string => (typeof val === 'string' ? val.trim() : '')
const getProse = (c: Content, key: string): string => safeStr(c?.prose?.[key])
const getRows = (c: Content, key: string) => (Array.isArray(c?.rows?.[key]) ? c.rows[key] : [])

// ----------------------------------------------------------------------------
// ECE & Interdisciplinary Domain Inference
// ----------------------------------------------------------------------------

export function detectEceAndInterdisciplinaryDomains(text: string): {
  eceDomains: EceSubDomain[]
  interdisciplinary: InterdisciplinaryDomain[]
} {
  const t = text.toLowerCase()
  const ece = new Set<EceSubDomain>()
  const inter = new Set<InterdisciplinaryDomain>()

  // Analog
  if (/\b(op-?amp|filter|amplifier|analog|sallen-key|bjt|mosfet|transconductance|tia|gain|bandwidth|impedance)\b/.test(t)) {
    ece.add('analog_circuits')
  }
  // Digital logic & VLSI
  if (/\b(fpga|verilog|vhdl|logic\s*gate|flip-?flop|fsm|lut|rtl|setup\s*time|hold\s*time|clock\s*skew)\b/.test(t)) {
    ece.add('digital_logic')
    ece.add('vlsi_semiconductor')
  }
  // Embedded & Microcontrollers
  if (/\b(mcu|microcontroller|stm32|esp32|arduino|arm\s*cortex|pic\b|atmega|gpio|interrupt|timer|pwm|uart|i2c|spi)\b/.test(t)) {
    ece.add('embedded_systems')
    ece.add('computer_architecture')
  }
  // IoT & Sensors
  if (/\b(sensor|iot|node|mqtt|coap|cloud|telemetry|lora|lorawan|zigbee|ble|bluetooth)\b/.test(t)) {
    ece.add('iot_sensors')
  }
  // Signal Processing & Signals/Systems
  if (/\b(dsp|fft|fir|iir|nyquist|sampling|quantization|convolution|filter\s*design|spectral|snr|thd|adc|dac)\b/.test(t)) {
    ece.add('signal_processing')
  }
  // Communication & RF
  if (/\b(rf|antenna|fsk|psk|qam|modulation|demodulation|carrier|link\s*budget|path\s*loss|s11|vswr|microwave)\b/.test(t)) {
    ece.add('communication_systems')
    ece.add('rf_microwave')
    ece.add('antennas')
  }
  // Power Electronics
  if (/\b(buck|boost|smps|inverter|converter|rectifier|ldo|regulator|flyback|pwm\s*driver|mosfet\s*gate)\b/.test(t)) {
    ece.add('power_electronics')
  }
  // Control & Instrumentation
  if (/\b(pid|feedback|closed-loop|bode|stability|phase\s*margin|gain\s*margin|transducer|bridge|strain\s*gauge)\b/.test(t)) {
    ece.add('control_instrumentation')
  }
  // PCB & Prototyping
  if (/\b(pcb|gerber|trace\s*width|ground\s*plane|decoupling|vias|layout|soldering|breadboard)\b/.test(t)) {
    ece.add('pcb_hardware')
  }

  // Interdisciplinary Checks
  if (/\b(motor|torque|gear|chassis|servo|stepper|encoder|rpm|kinematics|actuator|robot|robotics)\b/.test(t)) {
    inter.add('mechanical')
    ece.add('robotics_embedded_ai')
  }
  if (/\b(ecg|eeg|emg|ppg|biopotential|electrode|patient|heart\s*rate|spo2|biomedical|pulse\s*oximeter)\b/.test(t)) {
    inter.add('biomedical')
    ece.add('biomedical_electronics')
  }
  if (/\b(neural\s*network|cnn|tinyml|tensorflow\s*lite|model|inference|dataset|classifier|deep\s*learning|ai)\b/.test(t)) {
    inter.add('software_ai')
    ece.add('robotics_embedded_ai')
  }
  if (/\b(soil|water\s*quality|air\s*pollution|solar\s*harvesting|weather|civil|structural|concrete)\b/.test(t)) {
    inter.add('civil_environmental')
  }

  return {
    eceDomains: Array.from(ece),
    interdisciplinary: Array.from(inter),
  }
}

// ----------------------------------------------------------------------------
// ECE Signal Chain & Power Tree Synthesizers
// ----------------------------------------------------------------------------

export function synthesizeSignalChain(
  blocks: ArchitectureBlockItem[],
  bom: BomItem[],
  _requirements: FunctionalRequirementItem[],
): SignalChainSummary {
  const stages: SignalChainNode[] = []
  const mismatches: string[] = []

  for (const b of blocks) {
    const text = `${b.block} ${b.inputs || ''} ${b.outputs || ''}`.toLowerCase()
    let stage: SignalChainNode['stage'] = 'other'

    if (/\b(sensor|mic|microphone|transducer|antenna|probe|input|electrode|photodiode|load\s*cell|thermocouple)\b/.test(text)) {
      stage = 'input_sensor'
    } else if (/\b(amp|preamp|amplifier|filter|attenuator|buffer|conditioning|tia|sallen)\b/.test(text)) {
      stage = 'signal_conditioning'
    } else if (/\b(adc|conversion|sampler|digitiz|comparator)\b/.test(text)) {
      stage = 'conversion_adc'
    } else if (/\b(mcu|processor|controller|stm32|esp32|arduino|dsp|fpga|cpu)\b/.test(text)) {
      stage = 'processing_mcu'
    } else if (/\b(dac|driver|actuator|motor|speaker|display|output|relay)\b/.test(text)) {
      stage = 'actuation_output'
    } else if (/\b(rf|transceiver|modem|radio|wifi|ble|lora|bluetooth)\b/.test(text)) {
      stage = 'transceiver_rf'
    }

    // Correlate with BOM components
    const matchingParts = bom
      .filter((item) => text.includes(item.part.toLowerCase()) || (item.trace && item.trace.toLowerCase().includes(b.block.toLowerCase())))
      .map((item) => `${item.part}${item.value ? ` (${item.value})` : ''}`)

    stages.push({
      stage,
      name: b.block,
      block: b.block,
      inputSignal: b.inputs,
      outputSignal: b.outputs,
      keyComponents: matchingParts.length > 0 ? matchingParts : undefined,
    })
  }

  // Check stage ordering & potential impedance/voltage range mismatches
  const hasSensor = stages.some((s) => s.stage === 'input_sensor')
  const hasConditioning = stages.some((s) => s.stage === 'signal_conditioning')
  const hasAdc = stages.some((s) => s.stage === 'conversion_adc')

  if (hasSensor && hasAdc && !hasConditioning) {
    mismatches.push(
      'Signal chain note: Transducer/sensor feeds ADC directly without an explicit signal conditioning or anti-aliasing filter stage. Check if sensor output amplitude and bandwidth match ADC input specifications.',
    )
  }

  const flowDescription = stages.length > 0
    ? stages.map((s) => `[${s.stage.toUpperCase()}] ${s.name}`).join(' -> ')
    : 'No structured signal chain defined in architecture blocks.'

  return {
    stages,
    flowDescription,
    identifiedMismatches: mismatches,
  }
}

export function synthesizePowerTree(
  bom: BomItem[],
  inputs: DesignInputItem[],
  _blocks: ArchitectureBlockItem[],
): PowerTreeSummary {
  const regulators: PowerTreeSummary['regulators'] = []
  const rails = new Set<string>()
  const issues: string[] = []

  // Extract from inputs
  let primarySource = 'DC Supply'
  for (const inp of inputs) {
    const p = inp.parameter.toLowerCase()
    const v = inp.value.toLowerCase()
    if (p.includes('supply') || p.includes('voltage') || p.includes('power') || p.includes('battery')) {
      primarySource = `${inp.parameter}: ${inp.value}`
      if (/\d+\s*v/.test(v)) {
        const m = v.match(/(\d+(?:\.\d+)?)\s*v/)
        if (m) rails.add(`${m[1]}V`)
      }
    }
  }

  // Extract from BOM
  for (const item of bom) {
    const part = item.part.toLowerCase()
    const val = (item.value || '').toLowerCase()

    if (/\b(lm78\d{2}|ams1117|ld1117|tps\d+|mp\d+|lp\d+|regulator|buck|boost|ldo)\b/.test(part) || val.includes('regulator')) {
      let type: 'ldo' | 'buck' | 'boost' | 'linear' | 'unknown' = 'unknown'
      if (part.includes('lm78') || part.includes('ams1117') || part.includes('ld1117')) type = 'linear'
      else if (part.includes('buck') || part.includes('step-down')) type = 'buck'
      else if (part.includes('boost') || part.includes('step-up')) type = 'boost'

      let vout: string | undefined
      if (part.includes('7805') || val.includes('5v')) { vout = '5V'; rails.add('5V') }
      else if (part.includes('1117-3.3') || val.includes('3.3v')) { vout = '3.3V'; rails.add('3.3V') }
      else if (val.includes('1.8v')) { vout = '1.8V'; rails.add('1.8V') }

      regulators.push({ part: item.part, type, vout })
    }
  }

  if (rails.size === 0) {
    rails.add('5V') // Default nominal
  }

  return {
    primarySource,
    regulators,
    supplyRails: Array.from(rails),
    estimatedCurrents: {},
    potentialIssues: issues,
  }
}

/**
 * Builds a schema-aware, dynamic representation of the entire student submission.
 * Never throws on missing pages, undefined sections, or partially filled forms.
 */
export function buildStructuredProject(
  content: Content,
  meta?: { title?: string; themeName?: string },
): StructuredProject {
  const c = content ?? { prose: {}, rows: {}, evidence: [] }

  // 1. Team & Subsystems (Page 1)
  const memberRows = getRows(c, '1.members')
  const declaredSubsystems = memberRows
    .map((r) => safeStr(r.v?.subsystem))
    .filter(Boolean)

  // 2. Problem & Need (Page 2)
  const inputRows = getRows(c, '2.inputs')
  const designInputs: DesignInputItem[] = inputRows
    .map((r) => ({
      parameter: safeStr(r.v?.parameter),
      value: safeStr(r.v?.value),
      provenance: safeStr(r.v?.provenance) || 'assumed',
      source: safeStr(r.v?.source),
    }))
    .filter((i) => i.parameter || i.value)

  const candFrRows = getRows(c, '2.candfr')
  const candidateFRs = candFrRows
    .map((r) => ({
      statement: safeStr(r.v?.statement),
      target: safeStr(r.v?.target),
      method: safeStr(r.v?.method),
    }))
    .filter((cf) => cf.statement)

  // 3. Concept Choices (Page 3)
  const altRows = getRows(c, '3.alts')
  const alternatives: ConceptAlternativeItem[] = altRows
    .map((r) => ({
      name: safeStr(r.v?.name),
      idea: safeStr(r.v?.idea),
      pros: safeStr(r.v?.pros),
      cons: safeStr(r.v?.cons),
      fate: safeStr(r.v?.fate),
    }))
    .filter((a) => a.name)

  // 4. Functional Requirements (Page 4)
  const frRows = getRows(c, '4.frtable')
  const requirements: FunctionalRequirementItem[] = frRows
    .map((r) => ({
      no: safeStr(r.v?.no),
      statement: safeStr(r.v?.statement),
      target: safeStr(r.v?.target),
      method: safeStr(r.v?.method),
      source: safeStr(r.v?.source),
      status: safeStr(r.v?.status),
      reason: safeStr(r.v?.reason),
    }))
    .filter((fr) => fr.no || fr.statement)

  // 5. Architecture & Subsystems (Page 5)
  const blockRows = getRows(c, '5.blocks')
  const blocks: ArchitectureBlockItem[] = blockRows
    .map((r) => ({
      block: safeStr(r.v?.block),
      inputs: safeStr(r.v?.inputs),
      outputs: safeStr(r.v?.outputs),
      fr: safeStr(r.v?.fr),
    }))
    .filter((b) => b.block)

  const subaltRows = getRows(c, '5.subalts')
  const subsystemSelections = subaltRows
    .map((r) => ({
      block: safeStr(r.v?.block),
      alt: safeStr(r.v?.alt),
      choice: safeStr(r.v?.choice),
    }))
    .filter((s) => s.block)

  // 6. Calculations & BOM (Page 6)
  const calcRows = getRows(c, '6.calcs')
  const calculations: CalculationCardItem[] = calcRows
    .map((r) => ({
      title: safeStr(r.v?.title),
      fr: safeStr(r.v?.fr),
      assumptions: safeStr(r.v?.assumptions),
      working: safeStr(r.v?.working),
      result: safeStr(r.v?.result),
      course: safeStr(r.v?.course),
      date: safeStr(r.v?.date),
    }))
    .filter((cl) => cl.title || cl.working)

  const bomRows = getRows(c, '6.bom')
  const bom: BomItem[] = bomRows
    .map((r) => ({
      part: safeStr(r.v?.part),
      value: safeStr(r.v?.value),
      qty: safeStr(r.v?.qty),
      trace: safeStr(r.v?.trace),
    }))
    .filter((b) => b.part)

  // 7. Integration Map (Page 7)
  const mapRows = getRows(c, '7.map')
  const integrationMap = mapRows
    .map((r) => ({
      decision: safeStr(r.v?.decision),
      block: safeStr(r.v?.block),
      fr: safeStr(r.v?.fr),
      calc: safeStr(r.v?.calc),
      measured: safeStr(r.v?.measured),
    }))
    .filter((m) => m.decision)

  // 8. Build & Verification (Page 8)
  const testRows = getRows(c, '8.tests')
  const verificationTests = testRows
    .map((r) => ({
      parameter: safeStr(r.v?.parameter),
      instrument: safeStr(r.v?.instrument),
      predicted: safeStr(r.v?.predicted),
      measured: safeStr(r.v?.measured),
      remarks: safeStr(r.v?.remarks),
    }))
    .filter((t) => t.parameter)

  // 9. Validation (Page 9)
  const valRows = getRows(c, '9.validation')
  const validation: ValidationItem[] = valRows
    .map((r) => ({
      fr: safeStr(r.v?.fr),
      target: safeStr(r.v?.target),
      predicted: safeStr(r.v?.predicted),
      measured: safeStr(r.v?.measured),
      deviation: safeStr(r.v?.deviation),
      explain: safeStr(r.v?.explain),
      result: safeStr(r.v?.result),
    }))
    .filter((v) => v.fr || v.measured)

  // 10. Failures & Fixes (Page 10)
  const debugRows = getRows(c, '10.debug')
  const failures: DebugItem[] = debugRows
    .map((r) => ({
      symptom: safeStr(r.v?.symptom),
      test: safeStr(r.v?.test),
      cause: safeStr(r.v?.cause),
      fix: safeStr(r.v?.fix),
      remeasure: safeStr(r.v?.remeasure),
      learning: safeStr(r.v?.learning),
      state: safeStr(r.v?.state),
    }))
    .filter((d) => d.symptom)

  // Evidence summary
  const evList = Array.isArray(c?.evidence) ? c.evidence : []
  const evidenceSummary = evList.map((e) => ({
    pageId: e.pageId,
    name: safeStr(e.name),
    caption: safeStr(e.caption),
  }))

  // Synthesize ECE Signal Chain & Power Tree
  const signalChain = synthesizeSignalChain(blocks, bom, requirements)
  const powerTree = synthesizePowerTree(bom, designInputs, blocks)

  // Detect ECE Sub-domains & Interdisciplinary Touches
  const aggregatedText = [
    meta?.title || '',
    meta?.themeName || '',
    getProse(c, '2.need'),
    getProse(c, '2.background'),
    getProse(c, '3.selected'),
    ...blocks.map((b) => `${b.block} ${b.inputs || ''} ${b.outputs || ''}`),
    ...bom.map((b) => `${b.part} ${b.value || ''}`),
    ...calculations.map((cl) => `${cl.title} ${cl.working}`),
  ].join(' ')

  const { eceDomains, interdisciplinary } = detectEceAndInterdisciplinaryDomains(aggregatedText)

  return {
    title: meta?.title || getProse(c, '0.update').slice(0, 80) || undefined,
    themeName: meta?.themeName,
    declaredSubsystems,
    problemNeed: {
      statement: getProse(c, '2.need'),
      background: getProse(c, '2.background'),
      designInputs,
      candidateFRs,
    },
    conceptChoices: {
      alternatives,
      comparisonSummary: getProse(c, '3.compare'),
      selectedRationale: getProse(c, '3.selected'),
      scope: getProse(c, '3.scope'),
    },
    requirements,
    architecture: {
      blocks,
      subsystemSelections,
    },
    calculations,
    bom,
    componentReasons: getProse(c, '6.reasons'),
    integrationMap,
    verificationTests,
    validation,
    failures,
    notebookHighlights: getRows(c, '11.entries').map((r) => safeStr(r.v?.objective)).filter(Boolean),
    reflections: getRows(c, '13.reflect').map((r) => ({
      member: safeStr(r.v?.member),
      text: safeStr(r.v?.text),
    })),
    evidenceCount: evList.length,
    evidenceSummary,
    signalChain,
    powerTree,
    detectedEceDomains: eceDomains,
    interdisciplinaryDomains: interdisciplinary,
  }
}

/**
 * Creates a compact, token-efficient project digest for prompt injection.
 * Prevents prompt bloat while giving the LLM full architectural awareness.
 */
export function createProjectDigest(project: StructuredProject): ProjectDigest {
  const params: Record<string, string> = {}
  for (const inp of project.problemNeed?.designInputs ?? []) {
    if (inp.parameter && inp.value) {
      params[inp.parameter] = `${inp.value} (${inp.provenance})`
    }
  }

  const activeFRs = (project.requirements ?? []).map(
    (fr) => `${fr.no}: ${fr.statement.slice(0, 60)} [Target: ${fr.target || 'N/A'}]`,
  )

  const keyComponents = (project.bom ?? []).map(
    (b) => `${b.part}${b.value ? ` (${b.value})` : ''}`,
  )

  const summaryParts: string[] = []
  if (project.themeName) summaryParts.push(`Theme: ${project.themeName}`)
  if (project.problemNeed?.statement) {
    summaryParts.push(`Need: ${project.problemNeed.statement.slice(0, 160)}…`)
  }
  if (project.conceptChoices?.selectedRationale) {
    summaryParts.push(`Selected Architecture: ${project.conceptChoices.selectedRationale.slice(0, 160)}…`)
  }
  if (project.signalChain?.flowDescription) {
    summaryParts.push(`Signal Chain: ${project.signalChain.flowDescription}`)
  } else if (project.architecture?.blocks.length) {
    summaryParts.push(`Blocks: ${project.architecture.blocks.map((b) => b.block).join(' → ')}`)
  }

  const detectedDomainsList = [
    ...(project.detectedEceDomains || []),
    ...(project.interdisciplinaryDomains?.map((d) => `interdisciplinary:${d}`) || []),
  ]

  const powerSummary = project.powerTree
    ? `Rails: ${project.powerTree.supplyRails.join(', ')} | Source: ${project.powerTree.primarySource} | Regulators: ${project.powerTree.regulators.map((r) => `${r.part} (${r.type})`).join(', ') || 'None'}`
    : undefined

  return {
    summary: summaryParts.join(' | ') || 'Undergraduate engineering mini-project submission.',
    keyParameters: params,
    activeFRs,
    keyComponents,
    crossPageFindings: [], // Populated by crossPageAnalyzer
    signalChainFlow: project.signalChain?.flowDescription,
    powerTreeSummary: powerSummary,
    detectedDomains: detectedDomainsList,
  }
}

/**
 * Extracts target page content along with relevant cross-page references
 * (e.g. for Page 6 calculations, automatically surfaces Page 4 FRs and Page 2 Inputs).
 */
export function getTargetedPageContext(
  page: PageDef,
  content: Content,
  project: StructuredProject,
): string {
  const parts: string[] = []

  // 1. Current Page Content
  parts.push(`=== TARGET PAGE: Page ${page.id} — ${page.title} ===`)
  for (const sec of page.sections) {
    const k = `${page.id}.${sec.id}`
    if (sec.type === 'prose') {
      const text = getProse(content, k)
      if (text) {
        parts.push(`[Section: "${sec.title}"] (prose):\n${text}`)
      }
    } else if (sec.type === 'rows') {
      const rows = getRows(content, k)
      if (rows.length > 0) {
        const rowStr = rows
          .map((r, i) => `  (${i + 1}) ${JSON.stringify(r.v)}`)
          .join('\n')
        parts.push(`[Section: "${sec.title}"] (${sec.itemLabel}s):\n${rowStr}`)
      }
    }
  }

  const ev = (content?.evidence ?? []).filter((e) => e.pageId === page.id)
  if (ev.length > 0) {
    parts.push(
      `[Attached Evidence]:\n` +
        ev.map((e) => `  - "${e.name}": ${e.caption}`).join('\n'),
    )
  }

  // 2. Targeted Cross-Page Dependencies based on pageId
  parts.push('\n=== RELATED CROSS-PAGE CONTEXT ===')
  if (page.id === 6 || page.id === 5 || page.id === 7 || page.id === 9) {
    // Show Page 4 FRs
    if (project.requirements.length > 0) {
      parts.push(
        `Page 04 Functional Requirements:\n` +
          project.requirements
            .map((fr) => `  • [${fr.no}] ${fr.statement} (Target: ${fr.target}, Method: ${fr.method})`)
            .join('\n'),
      )
    }
    // Show Page 2 Design Inputs
    if (project.problemNeed?.designInputs.length) {
      parts.push(
        `Page 02 Quantified Design Inputs:\n` +
          project.problemNeed.designInputs
            .map((inp) => `  • ${inp.parameter}: ${inp.value} [${inp.provenance}]`)
            .join('\n'),
      )
    }
    // Show Inferred ECE Signal Chain Flow & Power Tree
    if (project.signalChain?.flowDescription) {
      parts.push(`ECE System Signal Chain:\n  ${project.signalChain.flowDescription}`)
      if (project.signalChain.identifiedMismatches.length > 0) {
        parts.push(`Signal Chain Interface Notes:\n` + project.signalChain.identifiedMismatches.map((m) => `  ⚠ ${m}`).join('\n'))
      }
    }
    if (project.powerTree?.supplyRails.length) {
      parts.push(`Power Rails & Supply:\n  Rails: ${project.powerTree.supplyRails.join(', ')} | Source: ${project.powerTree.primarySource}`)
    }
  }

  if (page.id === 9 && project.calculations.length > 0) {
    // Show Page 6 Calculations for validation comparison
    parts.push(
      `Page 06 Design Calculations (Predicted Working):\n` +
        project.calculations
          .map((c) => `  • ${c.title} (FR: ${c.fr || 'N/A'}): ${c.working} => Result: ${c.result}`)
          .join('\n'),
    )
  }

  if (page.id === 10 && project.validation.length > 0) {
    // Show Page 9 Validation failures for Page 10 Debugging log
    parts.push(
      `Page 09 Validation Results:\n` +
        project.validation
          .map((v) => `  • ${v.fr}: Target: ${v.target}, Meas: ${v.measured}, Dev: ${v.deviation}, Result: ${v.result}`)
          .join('\n'),
    )
  }

  return parts.join('\n\n')
}
