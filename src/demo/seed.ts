import type { EvidenceItem, MentorSession, Row, StepState } from '../state/store'

const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString()
const dateOnly = (offset: number) => day(offset).slice(0, 10)
const row = (v: Record<string, string>, offset = -3, id: string = crypto.randomUUID()): Row => ({ id, v, at: day(offset) })

/**
 * DEMO DATA ONLY — a fictional team's portfolio. It is deliberately imperfect (an assumed input, a vague
 * FR, a deferred FR with no reason, a block citing an FR that does not exist) so the contextual AI,
 * readiness and cross-check states have something real to show on every page.
 */
export function seedContent() {
  const prose: Record<string, string> = {
    '0.update': 'Selected the non-inverting op-amp topology with digitally switched feedback resistors for the first gain stage.',
    '2.need': 'Sensor outputs in our lab vary from about 10 mV to 2 V, so a fixed-gain amplifier either clips or loses resolution. We need a gain stage that the FPGA can set to several steps. We assume the input source impedance is low and the bandwidth is probably enough for slow sensors.',
    '2.background': 'Looked at the programmable gain amplifier families from two vendors and read the application note on resistor-ladder gain switching.',
    '3.compare': 'Criteria and weights (1–5): gain control resolution 5, reconfigurability 4, component count 3, complexity (design) 3, integration with theme 5. Scores were agreed in the team and checked against datasheet figures where they exist.',
    '3.selected': 'Provides high gain resolution and flexibility. Aligns with the programmable analog theme. Enables digital control and easy validation. Balanced complexity and implementation effort.',
    '3.scope': 'In scope: four gain steps (1, 2, 5, 10 V/V), FPGA 2-bit gain select, bandwidth and gain-error measurement. Out of scope: automatic gain ranging, PCB layout for production, temperature compensation.',
    '6.reasons': 'We chose the TLV9062 because its 10 MHz gain-bandwidth product leaves a gain of 10 with about 1 MHz of bandwidth, far above the 100 kHz requirement. The DG411 switch was picked for its 20 Ω on-resistance, because the Ron must stay small against the 1 kΩ gain resistor.',
    '8.integration': 'We brought the gain stage and the FPGA select logic together on a breadboard, stepped through the four gain codes with a function generator at 1 kHz, and logged output amplitude against the code from the scope.',
    '12.summary': 'At Review 1 we presented the need statement, the measured design inputs and three candidate requirements. The main points raised were the unquantified bandwidth requirement and the assumed source impedance.',
    '13.lessons': 'If we did this again we would measure the source impedance on day one and write the bandwidth target before choosing a part. Choosing the amplifier first made the later requirement look like a justification instead of a need.',
    '14.walk': 'FR-01 — 0:35 gain steps selected live with the 2-bit code\nFR-02 — 1:50 frequency sweep at ×10, −3 dB marker on the analyser\nFR-03 — 3:05 series 1 kΩ resistor inserted, gain re-read',
  }

  const idA = crypto.randomUUID(), idB = crypto.randomUUID(), idC = crypto.randomUUID()
  const m = (criterion: string, weight: string, a: [string, string], b: [string, string], c: [string, string]) =>
    row({ criterion, weight, [`t:${idA}`]: a[0], [`s:${idA}`]: a[1], [`t:${idB}`]: b[0], [`s:${idB}`]: b[1], [`t:${idC}`]: c[0], [`s:${idC}`]: c[1] }, -4)

  const rows: Record<string, Row[]> = {
    '1.members': [
      row({ name: 'You', subsystem: 'Analog gain stage', contact: 'lead@kletech.ac.in' }, -10),
      row({ name: 'Meera Hegde', subsystem: 'FPGA gain-select logic', contact: '' }, -10),
      row({ name: 'Rohan Patil', subsystem: 'Measurement and test setup', contact: '' }, -10),
      row({ name: 'Sneha Desai', subsystem: 'Power and signal conditioning', contact: '' }, -10),
    ],
    '1.contrib': [
      row({ review: 'Review 1', member: 'You', contribution: 'Measured the sensor range and wrote the need statement.' }, -9),
      row({ review: 'Review 1', member: 'Meera Hegde', contribution: 'Surveyed FPGA boards and drafted the gain-select interface.' }, -9),
      row({ review: 'Review 1', member: 'Rohan Patil', contribution: 'Built the scope capture setup for sensor outputs.' }, -9),
      row({ review: 'Review 1', member: 'Sneha Desai', contribution: 'Listed the supply rails and measured the noise floor.' }, -9),
      row({ review: 'Review 2', member: 'You', contribution: 'Drafted the resistor-ladder concept and its gain equation.' }, -3),
      row({ review: 'Review 2', member: 'Meera Hegde', contribution: 'Compared 2-bit and SPI gain-select options.' }, -3),
    ],
    '2.inputs': [
      row({ parameter: 'Input signal range', value: '10 mV – 2 V', provenance: 'measured', source: 'Lab sensor, scope capture 12 Aug' }, -9),
      row({ parameter: 'Supply', value: '±5 V', provenance: 'datasheet', source: 'Op-amp datasheet, abs. max table' }, -9),
      row({ parameter: 'Source impedance', value: '< 1 kΩ', provenance: 'assumed', source: '' }, -9),
    ],
    '2.candfr': [
      row({ statement: 'The system must provide selectable gain.', target: 'Gain steps 1, 2, 5, 10', method: 'Measure output / input with function generator' }, -8),
      row({ statement: 'The system must be fast enough.', target: '', method: '' }, -8),
      row({ statement: 'The system must keep gain error small.', target: '< 2 %', method: 'DMM and scope' }, -8),
    ],
    '3.alts': [
      row({ name: 'FPGA-based VGA (with LUT control)', idea: 'Non-inverting amplifier with feedback resistor ladder selected by analog switches driven from an FPGA LUT.', pros: 'High gain resolution, every step sized by hand, direct digital control', cons: 'Switch on-resistance (~20 Ω) adds minor gain error', fate: 'Selected' }, -4, idA),
      row({ name: 'Microcontroller + Digital Potentiometer', idea: 'A digital potentiometer sets the feedback ratio of a single op-amp stage over SPI.', pros: 'Fine, continuous gain steps via SPI', cons: 'High wiper resistance and low bandwidth at ×10 gain', fate: 'Rejected' }, -4, idB),
      row({ name: 'Analog VGA (with External Control)', idea: 'Off-the-shelf voltage-controlled / integrated PGA stage.', pros: 'Low component count, simple analog hookup', cons: 'Hides internal gain-sizing reasoning and lacks direct LUT reconfigurability', fate: 'Rejected' }, -4, idC),
    ],
    '3.matrix': [
      m('Gain control resolution', '5', ['High (≥ 8-bit)', '5'], ['Medium (6–8 bit)', '3'], ['Low (Analog)', '2']),
      m('Reconfigurability', '4', ['Excellent', '5'], ['Moderate', '3'], ['Low', '2']),
      m('Component count', '3', ['Moderate', '3'], ['Higher', '2'], ['Lower', '5']),
      m('Complexity (design)', '3', ['Moderate', '4'], ['Moderate', '3'], ['Low', '4']),
      m('Integration with theme', '5', ['High', '5'], ['Medium', '3'], ['Medium', '3']),
    ],
    '4.frtable': [
      row({ no: 'FR-01', statement: 'The system must provide gain steps of 1, 2, 5 and 10 V/V selectable by a 2-bit digital code.', target: '±2 % of nominal at 1 kHz', method: 'Function generator + scope, 5 readings per step', source: 'User need', status: 'Target confirmed and sizes calculation', reason: '' }, -2),
      row({ no: 'FR-02', statement: 'The system must have a −3 dB bandwidth of at least 100 kHz at the highest gain.', target: '≥ 100 kHz at ×10', method: 'Frequency sweep', source: 'Theme specification', status: 'Target confirmed and sizes calculation', reason: '' }, -2),
      row({ no: 'FR-03', statement: 'The system must tolerate a 1 kΩ source impedance.', target: 'Gain error < 1 % added', method: 'Series resistor test', source: 'User need', status: 'Deferred with reason', reason: '' }, -2),
      row({ no: 'FR-04', statement: 'The system must settle to within 1 % of final value after a gain change.', target: '≤ 10 µs', method: 'Scope, single-shot trigger on the gain code', source: 'Device datasheet', status: 'Under review — team not yet able to size this requirement', reason: '' }, -2),
    ],
    '5.blocks': [
      row({ block: 'Gain stage', inputs: 'Vin, gain code', outputs: 'Vout', fr: 'FR-01' }, -1),
      row({ block: 'Gain-select logic', inputs: '2-bit code', outputs: 'Switch drives', fr: 'FR-05' }, -1),
      row({ block: 'Output buffer', inputs: 'Vout', outputs: 'Vout (low-Z)', fr: 'FR-02' }, -1),
    ],
    '5.subalts': [
      row({ block: 'Gain stage', alt: 'Inverting amplifier with switched input resistor; integrated PGA.', choice: 'Non-inverting, because it keeps the input impedance in the megohms and the gain equation 1 + Rf/Rg visible.' }, -1),
    ],
    '6.calcs': [
      row({ title: 'Feedback network for the ×10 step', fr: 'FR-01', assumptions: 'Rg = 1 kΩ fixed. Switch on-resistance Ron = 20 Ω (datasheet, typical). Op-amp ideal at 1 kHz.', working: 'Gain = 1 + Rf / Rg\nRf = (10 − 1) × 1 kΩ = 9 kΩ\nWith Ron: Gain = 1 + (9 kΩ + 20 Ω) / 1 kΩ = 10.02\nError = (10.02 − 10) / 10 = 0.2 %', result: '9 kΩ, gain error 0.2 %', course: 'Analog Electronic Circuits', date: dateOnly(-6) }, -6),
      row({ title: 'Bandwidth at the highest gain', fr: 'FR-02', assumptions: 'GBW = 10 MHz (datasheet, typical). Single-pole roll-off.', working: 'f−3dB = GBW / Gain = 10 MHz / 10 = 1 MHz', result: '1 MHz (≥ 100 kHz required)', course: 'Linear Integrated Circuits', date: dateOnly(-5) }, -5),
    ],
    '6.bom': [
      row({ part: 'Op-amp', value: 'TLV9062, 10 MHz GBW', qty: '1', trace: 'Bandwidth calculation (FR-02)' }, -4),
      row({ part: 'Analog switch', value: 'DG411, Ron ≈ 20 Ω', qty: '1', trace: 'Feedback network calculation (FR-01)' }, -4),
      row({ part: 'Gain resistors', value: '1 kΩ, 9 kΩ, 4 kΩ, 1.5 kΩ — 0.1 %', qty: '4', trace: 'Feedback network calculation (FR-01)' }, -4),
    ],
    '7.map': [
      row({ decision: 'Non-inverting topology', block: 'Gain stage', fr: 'FR-01', calc: 'Feedback network', course: 'Analog Electronic Circuits', measured: '' }, -3),
      row({ decision: '2-bit gain code from the FPGA', block: 'Gain-select logic', fr: 'FR-01', calc: '—', course: 'Digital System Design', measured: '' }, -3),
      row({ decision: 'TLV9062 op-amp', block: 'Gain stage', fr: 'FR-02', calc: 'Bandwidth at ×10', course: 'Linear Integrated Circuits', measured: '880 kHz at ×10' }, -3),
    ],
    '7.cards': [
      row({ decision: 'Non-inverting topology', level: 'Applied', why: 'High input impedance means the sensor is not loaded, and the gain equation stays a single resistor ratio. An inverting stage would have set the input impedance by Rg.', fr: 'FR-01' }, -3),
    ],
    '8.sim': [
      row({ block: 'Gain stage — SPICE AC sweep', setup: 'Ideal switch model, Ron = 20 Ω, 1 Hz – 10 MHz sweep at each gain code.', result: '−3 dB at 960 kHz for ×10. Gain error at 1 kHz is 0.2 % for ×10 and 0.3 % for ×5.' }, -2),
      row({ block: 'Gain-select logic — testbench', setup: 'Walk all four codes with a 10 ns glitch injected on bit 0.', result: 'Switch drives follow the code; the glitch produces a 10 ns overlap on two switches, so the select logic registers its outputs.' }, -2),
    ],
    '8.tests': [
      row({ parameter: 'Gain, ×1', instrument: 'Scope, 5 averages', predicted: '1.000 V/V', measured: '0.998 V/V', deviation: '−0.2 %', remarks: 'Within ±2 %' }, -1),
      row({ parameter: 'Gain, ×10', instrument: 'Scope, 5 averages', predicted: '10.02 V/V', measured: '9.86 V/V', deviation: '−1.6 %', remarks: 'Inside target, larger than predicted' }, -1),
      row({ parameter: '−3 dB bandwidth, ×10', instrument: 'Function generator sweep', predicted: '960 kHz', measured: '880 kHz', deviation: '−8.3 %', remarks: 'Probe loading and board capacitance' }, -1),
    ],
    '8.deviations': [
      row({ what: 'Feedback resistors 1 % instead of 0.1 %', why: 'The 0.1 % values were out of stock for the lab build; the 1 % parts were measured and sorted with a DMM.' }, -1),
    ],
    '9.validation': [
      row({ fr: 'FR-01', target: '±2 % of nominal at 1 kHz', predicted: '0.2 %', measured: '1.6 %', deviation: '+1.4 pp', explain: 'Resistor tolerance (1 % parts) and switch Ron variation across channels.', result: 'Pass' }, -1),
      row({ fr: 'FR-02', target: '≥ 100 kHz at ×10', predicted: '960 kHz', measured: '880 kHz', deviation: '−8.3 %', explain: 'Probe loading and board capacitance reduce the bandwidth slightly.', result: 'Pass' }, -1),
    ],
    '10.debug': [
      row({ symptom: 'Output clips at ×10 for 300 mV inputs', test: 'Swept the input amplitude at ×10 and watched the output on the scope.', cause: 'The gain code was latched one clock late, so ×10 was selected while a 1.5 V test signal was still present.', fix: 'Registered the gain code and added a one-clock mute on the switch drives.', remeasure: 'No clipping up to 0.5 V in at ×10.', learning: 'Latency in the control path is a signal-path problem too.', state: 'Closed' }, -2),
      row({ symptom: 'Gain at ×5 reads 3 % low', test: 'Measured each resistor and the switch Ron on the bench.', cause: 'One 4 kΩ resistor measured 4.12 kΩ — outside its stated tolerance.', fix: 'Replaced and re-sorted the resistors by measured value.', remeasure: '', learning: 'Measure the parts before blaming the circuit.', state: 'Open' }, -1),
    ],
    '11.entries': [
      row({ date: dateOnly(-9), objective: 'Measure the sensor output range', decision: 'Captured 10 mV – 2 V on the scope; decided to target four gain steps.', course: 'Analog Electronic Circuits', learning: 'Noise floor near 3 mV limits the lowest useful range.', next: 'Draft candidate FRs' }, -9),
      row({ date: dateOnly(-4), objective: 'Compare gain-switching concepts', decision: 'Resistor ladder with analog switches beats an off-the-shelf PGA for the reasoning we need to show.', course: 'Linear Integrated Circuits', learning: 'Switch Ron must be small against Rg.', next: 'Write the comparison matrix' }, -4),
      row({ date: dateOnly(-1), objective: 'Fill the weighted comparison matrix', decision: 'Weighted score 3.9 for the ladder against 3.8 for the PGA IC once design reasoning was weighted 5.', course: 'Engineering Mathematics', learning: 'The weights decided the result more than the scores did.', next: 'Write the FR table' }, -12),
    ],
    '12.responses': [
      row({ observation: '“Bandwidth requirement is not quantified.”', response: 'Added FR-02 with a target of ≥ 100 kHz at ×10 and a measurement method.', changed: 'Page 4 — Functional Requirements' }, -6),
      row({ observation: '“How was the source impedance obtained?”', response: 'Measured about 600 Ω with a divider test; recorded the number as a design input.', changed: 'Page 2 — Problem and Need' }, -6),
    ],
    '13.reflect': [
      row({ member: 'You', review: 'Review 1', text: 'I assumed the sensor was a low-impedance source and only checked after the mentor asked. I now write the measurement beside every number before I use it.' }, -8),
      row({ member: 'Meera Hegde', review: 'Review 1', text: 'Writing the FPGA interface as a requirement first made the gain-select code almost trivial. The hard part was deciding what the code should mean.' }, -8),
    ],
    '13.forward': [
      row({ course: 'Minor Project', how: 'The gain stage becomes the front end of a sensor data-acquisition board.' }, -3),
      row({ course: 'Analog IC Design', how: 'The switch Ron versus Rg trade-off is the same one a CMOS PGA faces.' }, -3),
    ],
    '15.links': [
      row({ kind: 'Formal report', title: 'Formal project report (draft)', url: 'https://example.org/report-draft.pdf', notes: 'Linked, not copied' }, -2),
      row({ kind: 'RTL / firmware repository', title: 'gain-select RTL', url: 'https://example.org/vga-rtl', notes: 'Verilog, testbench included' }, -2),
    ],
  }
  const evidence: EvidenceItem[] = [
    { id: crypto.randomUUID(), name: 'sensor_range_scope_capture.png', mime: 'image/png', size: 182000, caption: 'Scope capture of the sensor output, 10 mV to 2 V, 12 Aug', pageId: 2, sectionId: 'inputs', addedAt: day(-9) },
    { id: crypto.randomUUID(), name: 'concept_sketches.pdf', mime: 'application/pdf', size: 640000, caption: 'Hand sketches of the three gain-switching concepts', pageId: 3, sectionId: 'alts', addedAt: day(-4) },
  ]
  const stepStates: Record<number, StepState> = { 1: 'done', 2: 'doing', 3: 'doing' }
  const mentor: MentorSession[] = [
    {
      id: crypto.randomUUID(), pageId: 2, startedAt: day(-5), endedAt: day(-5),
      questions: [
        { id: crypto.randomUUID(), pageId: 2, type: 'Unsupported assumption', quote: 'We assume the input source impedance is low', text: 'What source impedance did you measure for the sensor, and how does it compare with your amplifier’s input impedance?', status: 'resolved', followups: 1, thread: [
          { role: 'student', text: 'We measured about 600 Ω with a divider test. Input impedance of the op-amp is in the megohms, so loading is negligible.', at: day(-5) },
          { role: 'mentor', text: 'Good — a measured value with a ratio. Record that number as a measured design input rather than an assumption.', at: day(-5) },
        ] },
        { id: crypto.randomUUID(), pageId: 2, type: 'Needs context', quote: 'probably enough for slow sensors', text: 'How slow is "slow"? What is the highest frequency component in the sensor output?', status: 'open', followups: 0, thread: [] },
      ],
    },
  ]
  return { prose, rows, evidence, stepStates, mentor, activity: [{ at: day(-1), text: 'Edited Page 4 — Functional Requirements' }, { at: day(-2), text: 'Added evidence to Page 3 — Concept Choices' }] }
}
