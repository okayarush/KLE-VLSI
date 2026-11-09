import test from 'node:test'
import assert from 'node:assert'

import {
  isNonAnswer,
  evaluateAnswerOffline,
  validateAndNormalizeVerdict,
} from '../src/ai/answerEvaluator.ts'
import { analyzeTechnicalClaims } from '../src/ai/technicalClaims.ts'
import {
  checkDeterministicCalculation,
  parseEngineeringValue,
} from '../src/ai/engineeringKnowledge.ts'
import {
  verifyQuoteInContent,
  processAndFilterGeneratedQuestions,
  generateSmartFallbackQuestions,
} from '../src/ai/questionEngine.ts'
import {
  buildStructuredProject,
  createProjectDigest,
  getTargetedPageContext,
} from '../src/ai/projectContext.ts'
import { analyzeCrossPageConsistency } from '../src/ai/crossPageAnalyzer.ts'
import { getProgressiveHint } from '../src/ai/scaffoldingEngine.ts'
import {
  createInitialMemory,
  updateSessionMemory,
  checkContradictionWithMemory,
} from '../src/ai/sessionMemory.ts'
import { PAGES } from '../src/data/pages.ts'

// ============================================================================
// TEST 1: Evasion and Non-Answer Detection
// ============================================================================
test('1. Non-answers and evasions must be detected and never resolve', () => {
  const evasions = [
    'idk',
    'IDK',
    'i don\'t know',
    'dont know',
    'no idea',
    'dunno',
    'not sure',
    'skip',
    'pass',
    '',
    '   ',
    'idk because I have no clue what this formula is and I am completely lost on this question so please help me',
    'who knows',
    'asdasdasdasd',
  ]

  for (const text of evasions) {
    assert.strictEqual(
      isNonAnswer(text),
      true,
      `Expected "${text}" to be classified as a non-answer`,
    )

    const dummyQ = {
      id: 'q1',
      pageId: 6,
      type: 'Mathematical Derivation',
      text: 'How did you calculate op-amp gain?',
      status: 'open',
      followups: 0,
      thread: [],
    }

    const evalResult = evaluateAnswerOffline(text, dummyQ, 0)
    assert.strictEqual(
      evalResult.verdict,
      'non_answer',
      `Expected evaluation of "${text}" to be 'non_answer', got '${evalResult.verdict}'`,
    )
    assert.notStrictEqual(
      evalResult.verdict,
      'resolved',
      `Non-answer "${text}" must NEVER resolve`,
    )
  }
})

// ============================================================================
// TEST 2: Long Meaningless Answer Defense (Root Cause Bug Fix)
// ============================================================================
test('2. Long answers with filler and "because" must NOT auto-resolve', () => {
  const fillerAnswer =
    'We chose this component because it is very good and because our design needs a component that works reliably and because the team discussed it thoroughly in our meeting.'

  const dummyQ = {
    id: 'q1',
    pageId: 6,
    type: 'Open design choice',
    text: 'Why did you select the TLV9062 op-amp?',
    status: 'open',
    followups: 0,
    thread: [],
  }

  const evalResult = evaluateAnswerOffline(fillerAnswer, dummyQ, 0)
  assert.notStrictEqual(
    evalResult.verdict,
    'resolved',
    'Filler answer with "because" must not resolve',
  )
  assert.strictEqual(evalResult.verdict, 'needs_clarification')
})

// ============================================================================
// TEST 3: Irrelevant Text Detection
// ============================================================================
test('3. Irrelevant text must not resolve', () => {
  const irrelevant =
    'The weather in Belagavi is very pleasant during the monsoon season and we enjoy walking around campus.'

  const dummyQ = {
    id: 'q1',
    pageId: 6,
    type: 'Mathematical Derivation',
    text: 'What formula was used to size the feedback resistor?',
    status: 'open',
    followups: 0,
    thread: [],
  }

  const evalResult = evaluateAnswerOffline(irrelevant, dummyQ, 0)
  assert.notStrictEqual(evalResult.verdict, 'resolved')
  assert.strictEqual(evalResult.verdict, 'needs_clarification')
})

// ============================================================================
// TEST 4: Determinate Mathematical Error Detection
// ============================================================================
test('4. Incorrect mathematical calculations must be flagged as determinate errors', () => {
  // GBW calculation error: multiplying instead of dividing
  const incorrectMath =
    'For 10MHz GBW and gain 10, bandwidth is 100MHz because you multiply them'

  const calcCheck = checkDeterministicCalculation(incorrectMath)
  assert.strictEqual(calcCheck.supported, true)
  assert.strictEqual(calcCheck.isMathematicallyValid, false)

  const dummyQ = {
    id: 'q1',
    pageId: 6,
    type: 'Mathematical Derivation',
    text: 'What bandwidth does your op-amp achieve at gain 10?',
    status: 'open',
    followups: 0,
    thread: [],
  }

  const evalResult = evaluateAnswerOffline(incorrectMath, dummyQ, 0)
  assert.strictEqual(evalResult.verdict, 'incorrect')
  assert.strictEqual(evalResult.isDeterminateError, true)
})

// ============================================================================
// TEST 5: Technically Correct Mathematical Calculations
// ============================================================================
test('5. Correct mathematical calculations must verify accurately', () => {
  const correctMath =
    'For 10MHz GBW and gain 10, cutoff bandwidth is 1MHz because f-3dB = GBW / Av = 10MHz / 10'

  const calcCheck = checkDeterministicCalculation(correctMath)
  assert.strictEqual(calcCheck.supported, true)
  assert.strictEqual(calcCheck.isMathematicallyValid, true)

  const dummyQ = {
    id: 'q1',
    pageId: 6,
    type: 'Mathematical Derivation',
    text: 'What bandwidth does your op-amp achieve at gain 10?',
    status: 'open',
    followups: 0,
    thread: [],
  }

  const evalResult = evaluateAnswerOffline(correctMath, dummyQ, 0)
  assert.strictEqual(evalResult.verdict, 'resolved')
  assert.strictEqual(evalResult.isDeterminateError, false)
})

// ============================================================================
// TEST 6: Op-Amp Gain Network & Power Dissipation Calculations
// ============================================================================
test('6. Deterministic formula checks for Op-Amp Gain and Power Dissipation', () => {
  // Op-amp gain: Av = 1 + Rf/Rg
  const opAmpCalcCorrect = 'In our non-inverting circuit, Rf = 9k and Rg = 1k, so gain = 10'
  const checkOpAmp = checkDeterministicCalculation(opAmpCalcCorrect)
  assert.strictEqual(checkOpAmp.supported, true)
  assert.strictEqual(checkOpAmp.isMathematicallyValid, true)

  const opAmpCalcWrong = 'In our non-inverting circuit, Rf = 9k and Rg = 1k, so gain = 9'
  const checkOpAmpWrong = checkDeterministicCalculation(opAmpCalcWrong)
  assert.strictEqual(checkOpAmpWrong.supported, true)
  assert.strictEqual(checkOpAmpWrong.isMathematicallyValid, false)

  // Linear regulator dissipation: Pd = (Vin - Vout) * Iload
  const pwrCorrect = 'For regulator LM7805 with Vin = 12V and Vout = 5V at Iload = 200mA, dissipation Pd = 1.4W'
  const checkPwr = checkDeterministicCalculation(pwrCorrect)
  assert.strictEqual(checkPwr.supported, true)
  assert.strictEqual(checkPwr.isMathematicallyValid, true)

  const pwrWrong = 'For regulator with Vin = 12V and Vout = 5V at Iload = 200mA, dissipation Pd = 0.5W'
  const checkPwrWrong = checkDeterministicCalculation(pwrWrong)
  assert.strictEqual(checkPwrWrong.supported, true)
  assert.strictEqual(checkPwrWrong.isMathematicallyValid, false)
})

// ============================================================================
// TEST 7: Quote Verification Gate (Zero Quote Hallucination)
// ============================================================================
test('7. Quote Verification Gate must reject hallucinated quotes', () => {
  const content = {
    prose: {
      '6.reasons': 'We chose the TLV9062 because its 10 MHz gain-bandwidth product leaves a gain of 10 with about 1 MHz of bandwidth.',
    },
    rows: {
      '6.bom': [
        { id: '1', v: { part: 'TLV9062', value: '10 MHz GBW' }, at: '2026-11-09' },
      ],
    },
    evidence: [],
  }

  // Quote that exists in prose
  assert.strictEqual(
    verifyQuoteInContent('10 MHz gain-bandwidth product', content),
    true,
  )

  // Quote that exists in table cell
  assert.strictEqual(
    verifyQuoteInContent('TLV9062', content),
    true,
  )

  // Hallucinated quote that does not exist anywhere
  assert.strictEqual(
    verifyQuoteInContent('We selected an Arduino Uno microcontroller', content),
    false,
  )

  // Test processAndFilterGeneratedQuestions strips hallucinated quote
  const rawQuestions = [
    {
      type: 'Unsupported assumption',
      quote: 'We selected an Arduino Uno microcontroller',
      text: 'Why Arduino?',
    },
    {
      type: 'Possible error',
      quote: '10 MHz gain-bandwidth product',
      text: 'Explain GBW margin.',
    },
  ]

  const processed = processAndFilterGeneratedQuestions(rawQuestions, PAGES[6], content)
  assert.strictEqual(processed[0].quote, undefined, 'Hallucinated quote must be stripped')
  assert.strictEqual(processed[1].quote, '10 MHz gain-bandwidth product', 'Valid quote must be preserved')
})

// ============================================================================
// TEST 8: Evidence-Based Cross-Page Contradiction & Traceability Analysis
// ============================================================================
test('8. Cross-page consistency must identify true contradictions without mistaking missing data for conflicts', () => {
  const project = {
    title: 'PGA Project',
    declaredSubsystems: ['Analog Gain'],
    problemNeed: {
      designInputs: [
        { parameter: 'Supply rail', value: '5 V', provenance: 'datasheet' },
      ],
      candidateFRs: [],
    },
    requirements: [
      { no: 'FR-01', statement: 'Gain steps 1, 2, 5, 10', target: '±2%', method: 'Scope', source: 'Need', status: 'Target confirmed' },
      { no: 'FR-02', statement: 'Bandwidth ≥ 100 kHz', target: '≥ 100 kHz', method: 'Sweep', source: 'Spec', status: 'Target confirmed' },
    ],
    architecture: {
      blocks: [
        { block: 'Gain stage', fr: 'FR-01' },
        { block: 'Dangling Block', fr: 'FR-09' }, // Dangling reference
      ],
      subsystemSelections: [],
    },
    calculations: [
      { title: 'Gain calc', fr: 'FR-01', working: 'Av = 10', result: '10 V/V' },
    ],
    bom: [
      { part: '12V Motor Driver IC', value: '12 V rating' }, // Contradiction with 5V supply
    ],
    validation: [],
    failures: [],
    evidenceCount: 0,
    evidenceSummary: [],
  }

  const findings = analyzeCrossPageConsistency(project)

  // 1. Should find traceability warning for FR-09
  const frFinding = findings.find((f) => f.type === 'traceability' && f.pageA.id === 5)
  assert.ok(frFinding, 'Must identify dangling FR-09 reference')
  assert.strictEqual(frFinding.pageA.id, 5)
  assert.strictEqual(frFinding.pageB.id, 4)

  // 2. Should find contradiction for 12V vs 5V supply
  const voltFinding = findings.find((f) => f.type === 'contradiction')
  assert.ok(voltFinding, 'Must identify supply rail contradiction')
  assert.strictEqual(voltFinding.pageA.id, 2)
  assert.strictEqual(voltFinding.pageB.id, 6)
  assert.ok(voltFinding.explanation.includes('12V'))
})

// ============================================================================
// TEST 9: Progressive Pedagogical Scaffolding
// ============================================================================
test('9. Progressive scaffolding delivers 3 contextual tiers without giving away answers', () => {
  const question = {
    id: 'q1',
    pageId: 6,
    type: 'Mathematical Derivation',
    text: 'How did you calculate op-amp gain and resistor sizing?',
    status: 'open',
    followups: 0,
    thread: [],
  }

  // Tier 1: Conceptual direction
  const hint1 = getProgressiveHint(question, 1)
  assert.strictEqual(hint1.level, 1)
  assert.ok(hint1.hintText.toLowerCase().includes('feedback') || hint1.hintText.toLowerCase().includes('topology'))

  // Tier 2: Mathematical relationship
  const hint2 = getProgressiveHint(question, 2)
  assert.strictEqual(hint2.level, 2)
  assert.ok(hint2.hintText.includes('Av = 1 + (Rf / Rg)'))

  // Tier 3: Concrete calculation substitution
  const hint3 = getProgressiveHint(question, 3)
  assert.strictEqual(hint3.level, 3)
  assert.ok(hint3.hintText.includes('Rg') && hint3.hintText.includes('Rf'))
})

// ============================================================================
// TEST 10: Session Memory Continuity & Contradiction Detection
// ============================================================================
test('10. Session memory preserves established facts and detects contradictions across questions', () => {
  let memory = createInitialMemory()

  // Establish fact in Question 1
  memory = updateSessionMemory(memory, {
    questionText: 'What is the circuit supply voltage?',
    status: 'resolved',
    conceptMastered: 'Dual supply rail configuration',
    establishedFact: { key: 'supply_rail', val: '±5V' },
  })

  assert.strictEqual(memory.conceptsMastered.length, 1)
  assert.strictEqual(memory.establishedFacts['supply_rail'], '±5V')

  // In Question 2, student contradicts established fact by claiming 12V
  const contradiction = checkContradictionWithMemory('We power this block with 12V directly', memory)
  assert.ok(contradiction, 'Must detect contradiction with previously established supply rail')
  assert.ok(contradiction.includes('±5V'))

  // Now evaluate with memory passed
  const dummyQ = {
    id: 'q2',
    pageId: 6,
    type: 'Open design choice',
    text: 'Explain power distribution.',
    status: 'open',
    followups: 0,
    thread: [],
  }

  const evalResult = evaluateAnswerOffline('We power this block with 12V directly', dummyQ, 0, memory)
  assert.strictEqual(evalResult.verdict, 'incorrect')
  assert.strictEqual(evalResult.isDeterminateError, true)
})

// ============================================================================
// TEST 11: Schema-Aware Dynamic Context Builder (Incomplete Portfolio Resilience)
// ============================================================================
test('11. Dynamic context builder handles sparse or missing portfolio content gracefully', () => {
  // Completely empty content object
  const emptyContent = { prose: {}, rows: {}, evidence: [] }
  const project = buildStructuredProject(emptyContent)

  assert.ok(project, 'Project context must build without throwing')
  assert.strictEqual(project.requirements.length, 0)
  assert.strictEqual(project.calculations.length, 0)
  assert.strictEqual(project.evidenceCount, 0)

  const digest = createProjectDigest(project)
  assert.ok(digest.summary)
  assert.strictEqual(digest.activeFRs.length, 0)

  const targetedContext = getTargetedPageContext(PAGES[2], emptyContent, project)
  assert.ok(targetedContext.includes('TARGET PAGE: Page 2'))
})

// ============================================================================
// TEST 12: Normalizer Defense Against Malformed LLM Verdicts
// ============================================================================
test('12. Normalizer protects against invalid or malformed model responses', () => {
  // Model hallucinates 'approved' or random string
  const malformed = { verdict: 'approved', reply: 'Great job!' }
  const normalized = validateAndNormalizeVerdict(malformed, 'My technical answer with details')
  assert.strictEqual(normalized.verdict, 'needs_clarification')

  // Non-answer must override model hallucinating 'resolved'
  const modelGaveResolvedForIdk = { verdict: 'resolved', reply: 'Good attempt.' }
  const normalizedForIdk = validateAndNormalizeVerdict(modelGaveResolvedForIdk, 'idk')
  assert.strictEqual(normalizedForIdk.verdict, 'non_answer', 'idk must override model returning resolved')
})

// ============================================================================
// TEST 13: Engineering Unit Parsing
// ============================================================================
test('13. Unit parsing and normalization for engineering values', () => {
  const v1 = parseEngineeringValue('10 MHz')
  assert.strictEqual(v1.num, 1e7)

  const v2 = parseEngineeringValue('100 kHz')
  assert.strictEqual(v2.num, 1e5)

  const v3 = parseEngineeringValue('1 kΩ')
  assert.strictEqual(v3.num, 1000)

  const v4 = parseEngineeringValue('200 mA')
  assert.strictEqual(v4.num, 0.2)
})

// ============================================================================
// TEST 14: Smart Fallback Questions Cover Seven Lenses
// ============================================================================
test('14. Smart fallback questions are grounded and tag engineering lenses', () => {
  const content = {
    prose: {
      '2.need': 'Need a selectable gain amplifier for sensor range 10mV to 2V.',
      '6.reasons': 'We chose TLV9062 for 10MHz GBW.',
    },
    rows: {
      '2.inputs': [
        { id: '1', v: { parameter: 'Source impedance', value: '< 1 kΩ', provenance: 'assumed' }, at: '2026-11-09' },
      ],
      '4.frtable': [
        { id: '1', v: { no: 'FR-01', statement: 'Gain steps 1, 2, 5, 10', target: '±2%' }, at: '2026-11-09' },
      ],
      '6.calcs': [
        { id: '1', v: { title: 'Gain calculation', working: 'Gain = 1 + Rf/Rg', result: '10' }, at: '2026-11-09' },
      ],
      '6.bom': [
        { id: '1', v: { part: 'TLV9062', value: '10MHz' }, at: '2026-11-09' },
      ],
    },
    evidence: [],
  }

  const project = buildStructuredProject(content)
  const qs = generateSmartFallbackQuestions(PAGES[6], content, project)

  assert.ok(qs.length >= 2, 'Should generate at least 2 questions for Page 6')
  const mathQ = qs.find((q) => q.lens === 'Mathematical Derivation')
  assert.ok(mathQ, 'Must generate a Mathematical Derivation lens question')
  assert.ok(mathQ.rationale?.scaffoldingHints.length === 3, 'Must attach 3 progressive hints')
})

// ============================================================================
// TEST 15: Valid Alternative Engineering Approaches (Trade-Offs Accepted)
// ============================================================================
test('15. Valid alternative design approaches are accepted with sound trade-off rationale', () => {
  const tradeOffAnswer =
    'We considered using a digital potentiometer like MCP41010, but rejected it because its wiper resistance of ~50Ω introduces a non-linear gain error and its 2.5pF parasitic capacitance limits bandwidth to below 50kHz at gain 10.'

  // Model response simulation for trade-off evaluation
  const modelResponse = {
    verdict: 'resolved',
    reply: 'Your trade-off analysis regarding wiper resistance and parasitic capacitance is technically sound. Make sure this rationale is documented in your Pugh matrix comparison.',
    justificationEvaluation: 'Valid trade-off justification accepted based on stated device constraints.',
  }

  const normalized = validateAndNormalizeVerdict(modelResponse, tradeOffAnswer)
  assert.strictEqual(normalized.verdict, 'resolved')
  assert.ok(normalized.reply.includes('trade-off'))
})

// ============================================================================
// TEST 16: Uncertain Technical Claims (Needs Verification)
// ============================================================================
test('16. Claims that cannot be verified from available context return needs_verification', () => {
  const unverifiedClaim =
    'Our custom sensor prototype achieved 99.8% precision at 500kHz across 100 test runs on our lab bench.'

  const dummyQ = {
    id: 'q1',
    pageId: 9,
    type: 'Missing evidence',
    text: 'What evidence demonstrates this precision level?',
    status: 'open',
    followups: 0,
    thread: [],
  }

  const offlineEval = evaluateAnswerOffline(unverifiedClaim, dummyQ, 0)
  assert.strictEqual(offlineEval.verdict, 'needs_verification')
  assert.ok(offlineEval.reply.includes('datasheet') || offlineEval.reply.includes('capture') || offlineEval.reply.includes('verify'))
})

// ============================================================================
// TEST 17: Complete End-to-End Multi-Turn Viva Lifecycle
// ============================================================================
test('17. End-to-end multi-turn viva conversation progression with progressive hints', () => {
  const dummyQ = {
    id: 'q-gbw',
    pageId: 6,
    type: 'Mathematical Derivation',
    text: 'What bandwidth will your op-amp circuit have at its maximum gain of 10, given the TLV9062 datasheet?',
    status: 'open',
    followups: 0,
    thread: [],
  }

  let memory = createInitialMemory()

  // Turn 1: Student says "idk"
  const turn1Eval = evaluateAnswerOffline('idk', dummyQ, 0, memory)
  assert.strictEqual(turn1Eval.verdict, 'non_answer', 'Turn 1: idk must be non_answer')
  assert.notStrictEqual(turn1Eval.verdict, 'resolved')

  // Student requests Hint 1
  const hint1 = getProgressiveHint(dummyQ, 1)
  assert.strictEqual(hint1.level, 1)

  // Turn 2: Student gives partial / qualitative answer
  const turn2Eval = evaluateAnswerOffline('The bandwidth drops when the gain is high because of the gain bandwidth product', dummyQ, 1, memory)
  assert.strictEqual(turn2Eval.verdict, 'needs_clarification', 'Turn 2: qualitative answer needs clarification')

  // Student requests Hint 2
  const hint2 = getProgressiveHint(dummyQ, 2)
  assert.strictEqual(hint2.level, 2)
  assert.ok(hint2.hintText.includes('GBW / Av'))

  // Turn 3: Student supplies complete mathematical derivation
  const turn3Text = 'TLV9062 has GBW of 10MHz. For Av = 10, cutoff frequency is f-3dB = GBW / Av = 10MHz / 10 = 1MHz'
  const turn3Eval = evaluateAnswerOffline(turn3Text, dummyQ, 2, memory)
  assert.strictEqual(turn3Eval.verdict, 'resolved', 'Turn 3: complete derivation must resolve')

  // Update memory
  memory = updateSessionMemory(memory, {
    questionText: dummyQ.text,
    status: 'resolved',
    conceptMastered: 'Gain-Bandwidth Product derivation for closed-loop op-amp',
    establishedFact: { key: 'max_bandwidth', val: '1MHz at gain 10' },
  })

  assert.strictEqual(memory.conceptsMastered.length, 1)
  assert.strictEqual(memory.establishedFacts['max_bandwidth'], '1MHz at gain 10')
})

// ============================================================================
// TEST 18: Fabricated Datasheet Claims, Category Errors & Conflation (User Test)
// ============================================================================
test('18. Fabricated datasheet claims, category errors and dimensional conflation must be challenged', () => {
  const fabricatedClaim =
    'According to the datasheets, the Electret Microphone has a sensitivity of 150 dB and operates at 12V, whereas the Audio Jack has a maximum sensitivity of only 2 dB and operates at 1V. Therefore, the Electret Microphone is technically superior in every parameter. These values prove that it is the better choice.'

  // 1. Direct Technical Claims Analysis
  const claimAnalysis = analyzeTechnicalClaims(fabricatedClaim)
  assert.strictEqual(claimAnalysis.isAcceptable, false, 'Fabricated claim must not be acceptable')
  assert.strictEqual(claimAnalysis.hasCategoryError, true, 'Must detect category error (audio jack sensitivity)')
  assert.strictEqual(claimAnalysis.hasDimensionalMismatch, true, 'Must detect dimensional conflation (dB vs V)')
  assert.strictEqual(claimAnalysis.hasImplausibleValue, true, 'Must detect implausible 150 dB sensitivity')
  assert.strictEqual(claimAnalysis.verdict, 'technically_incorrect', 'Verdict must be technically_incorrect')

  // 2. Offline Evaluation Gate
  const dummyQ = {
    id: 'q-mic',
    pageId: 5,
    type: 'Open design choice',
    text: 'Why did you select the electret microphone over the audio jack input?',
    status: 'open',
    followups: 0,
    thread: [],
  }

  const evalResult = evaluateAnswerOffline(fabricatedClaim, dummyQ, 0)
  assert.strictEqual(evalResult.verdict, 'incorrect', 'Evaluation verdict must be incorrect')
  assert.strictEqual(evalResult.isDeterminateError, true, 'Must be marked as determinate error')
  assert.notStrictEqual(evalResult.verdict, 'resolved', 'Must NEVER be resolved')
  assert.ok(evalResult.reply.includes('audio jack') || evalResult.reply.includes('passive connector'), 'Must challenge passive connector category error')
  assert.ok(evalResult.reply.includes('sensitivity') && (evalResult.reply.includes('voltage') || evalResult.reply.includes('parameters')), 'Must challenge parameter conflation')

  // 3. Normalizer Model Override Protection
  // If an external LLM erroneously returns resolved, the normalizer must reject it
  const modelHallucination = {
    verdict: 'resolved',
    reply: 'Great quantified explanation with datasheet numbers.',
    justificationEvaluation: 'Accepted numbers.',
  }
  const overridden = validateAndNormalizeVerdict(modelHallucination, fabricatedClaim)
  assert.strictEqual(overridden.verdict, 'incorrect', 'Normalizer must override model hallucination to incorrect')
  assert.strictEqual(overridden.isDeterminateError, true)
})

// ============================================================================
// TEST 19: Correct Values with Incorrect Units (Dimensional Mismatch)
// ============================================================================
test('19. Slew rate expressed in frequency units (MHz) must be flagged as dimensional mismatch', () => {
  const incorrectUnitClaim =
    'We selected the op-amp with a slew rate of 10 MHz to prevent signal distortion at high frequencies.'

  const claimAnalysis = analyzeTechnicalClaims(incorrectUnitClaim)
  assert.strictEqual(claimAnalysis.isAcceptable, false)
  assert.strictEqual(claimAnalysis.hasDimensionalMismatch, true)
  assert.ok(claimAnalysis.identifiedIssues.some((i) => i.includes('V/µs') || i.includes('slew rate')))

  const dummyQ = {
    id: 'q-slew',
    pageId: 6,
    type: 'Open design choice',
    text: 'Why did you select this op-amp for the output stage?',
    status: 'open',
    followups: 0,
    thread: [],
  }

  const evalResult = evaluateAnswerOffline(incorrectUnitClaim, dummyQ, 0)
  assert.strictEqual(evalResult.verdict, 'incorrect')
  assert.strictEqual(evalResult.isDeterminateError, true)
})

// ============================================================================
// TEST 20: Correct Values Attributed to Wrong Component (Category Error)
// ============================================================================
test('20. Attributing acoustic sensitivity to passive connector is flagged as category error', () => {
  const wrongComponentClaim =
    'We chose the 3.5mm audio jack because its sensitivity is -42 dBV/Pa, allowing it to capture faint sounds.'

  const claimAnalysis = analyzeTechnicalClaims(wrongComponentClaim)
  assert.strictEqual(claimAnalysis.hasCategoryError, true)
  assert.strictEqual(claimAnalysis.verdict, 'technically_incorrect')
})

// ============================================================================
// TEST 21: Comparing Unrelated Parameters (Dimensional Conflation)
// ============================================================================
test('21. Conflating DC supply voltage with acoustic performance must be flagged', () => {
  const conflatedClaim =
    'The microphone is superior because it operates at 12V supply rail, which delivers higher sensitivity than a 3.3V rail.'

  const claimAnalysis = analyzeTechnicalClaims(conflatedClaim)
  assert.strictEqual(claimAnalysis.isAcceptable, false)
  assert.ok(claimAnalysis.hasDimensionalMismatch || claimAnalysis.hasUnverifiedDatasheetClaim)
})

// ============================================================================
// TEST 22: Real Values Without Operating Conditions (Unverified Claim)
// ============================================================================
test('22. Real specifications citing datasheets without part number or test conditions return needs_verification', () => {
  const unverifiedDatasheetClaim =
    'According to the datasheets, the microphone sensitivity is -42 dBV and noise floor is low.'

  const claimAnalysis = analyzeTechnicalClaims(unverifiedDatasheetClaim)
  assert.strictEqual(claimAnalysis.hasUnverifiedDatasheetClaim, true)
  assert.strictEqual(claimAnalysis.verdict, 'unverified')

  const dummyQ = {
    id: 'q-mic2',
    pageId: 6,
    type: 'Missing evidence',
    text: 'What datasheet figures support this sensitivity?',
    status: 'open',
    followups: 0,
    thread: [],
  }

  const evalResult = evaluateAnswerOffline(unverifiedDatasheetClaim, dummyQ, 0)
  assert.strictEqual(evalResult.verdict, 'needs_verification')
  assert.ok(evalResult.reply.includes('manufacturer') || evalResult.reply.includes('model'))
})

// ============================================================================
// TEST 23: Physical Law Violations (Efficiency > 100%)
// ============================================================================
test('23. Power efficiency exceeding 100% is flagged as physically implausible', () => {
  const impossibleEfficiency =
    'Our switching regulator achieved an efficiency of 115% under full load.'

  const claimAnalysis = analyzeTechnicalClaims(impossibleEfficiency)
  assert.strictEqual(claimAnalysis.hasImplausibleValue, true)
  assert.strictEqual(claimAnalysis.verdict, 'physically_implausible')

  const dummyQ = {
    id: 'q-pwr',
    pageId: 9,
    type: 'Possible error',
    text: 'What power efficiency was measured on the bench?',
    status: 'open',
    followups: 0,
    thread: [],
  }

  const evalResult = evaluateAnswerOffline(impossibleEfficiency, dummyQ, 0)
  assert.strictEqual(evalResult.verdict, 'incorrect')
  assert.strictEqual(evalResult.isDeterminateError, true)
})

// ============================================================================
// TEST 24: ECE Domain 1 — Sensor-Based Embedded System
// ============================================================================
test('24. ECE Domain 1: Sensor-based embedded system signal chain and ADC resolution', () => {
  const portfolioContent = {
    prose: {
      '2.need': 'Need a digital weight scale with 10g resolution using a strain gauge load cell.',
      '3.selected': 'Selected an INA128 instrumentation amplifier feeding an ADS1115 16-bit ADC connected via I2C to an STM32F401 microcontroller.',
    },
    rows: {
      '4.frtable': [
        { id: '1', v: { no: 'FR-01', statement: 'Weight resolution 10g up to 5kg', target: '≤ 10g' } },
      ],
      '5.blocks': [
        { id: '1', v: { block: 'Load Cell', inputs: 'Mechanical force', outputs: 'Differential mV signal' } },
        { id: '2', v: { block: 'Instrumentation Amp (INA128)', inputs: 'Differential mV', outputs: '0-3.3V amplified analog' } },
        { id: '3', v: { block: 'ADC (ADS1115)', inputs: '0-3.3V analog', outputs: '16-bit I2C digital data' } },
        { id: '4', v: { block: 'MCU (STM32F401)', inputs: 'I2C digital data', outputs: 'OLED display' } },
      ],
      '6.bom': [
        { id: '1', v: { part: 'INA128', value: 'Gain = 500' } },
        { id: '2', v: { part: 'ADS1115', value: '16-bit' } },
        { id: '3', v: { part: 'STM32F401', value: '84MHz' } },
      ],
    },
    evidence: [],
  }

  const project = buildStructuredProject(portfolioContent)
  assert.ok(project.detectedEceDomains?.includes('embedded_systems'))
  assert.ok(project.detectedEceDomains?.includes('iot_sensors') || project.detectedEceDomains?.includes('analog_circuits'))
  assert.ok(project.signalChain?.stages.length === 4)
  assert.strictEqual(project.signalChain?.stages[0].stage, 'input_sensor')
  assert.strictEqual(project.signalChain?.stages[1].stage, 'signal_conditioning')
  assert.strictEqual(project.signalChain?.stages[2].stage, 'conversion_adc')
  assert.strictEqual(project.signalChain?.stages[3].stage, 'processing_mcu')

  // Test deterministic ADC calculation check
  const calcText = 'ADS1115 has 16-bit resolution with Vref = 3.3V, giving LSB = 3.3V / 2^16 = 0.050 mV'
  const calcResult = checkDeterministicCalculation(calcText)
  assert.strictEqual(calcResult.supported, true)
  assert.strictEqual(calcResult.isMathematicallyValid, true)
})

// ============================================================================
// TEST 25: ECE Domain 2 — Analog Signal Conditioning Circuit
// ============================================================================
test('25. ECE Domain 2: Analog signal conditioning filter cutoff and GBW verification', () => {
  // Test RC filter cutoff formula: fc = 1 / (2 * pi * R * C)
  const filterText = 'Active low-pass filter with R = 10k and C = 10n gives cutoff frequency fc = 1/(2*pi*R*C) = 1.59 kHz'
  const check = checkDeterministicCalculation(filterText)
  assert.strictEqual(check.supported, true)
  assert.strictEqual(check.isMathematicallyValid, true)
  assert.strictEqual(check.ruleId, 'rc_filter_cutoff')

  // Discrepancy test: student claims 15.9 kHz instead of 1.59 kHz
  const wrongFilterText = 'Active low-pass filter with R = 10k and C = 10n gives cutoff frequency fc = 1/(2*pi*R*C) = 15.9 kHz'
  const wrongCheck = checkDeterministicCalculation(wrongFilterText)
  assert.strictEqual(wrongCheck.supported, true)
  assert.strictEqual(wrongCheck.isMathematicallyValid, false)
})

// ============================================================================
// TEST 26: ECE Domain 3 — Digital Communication System
// ============================================================================
test('26. ECE Domain 3: Digital communication link budget and modulation trade-off', () => {
  const commPortfolio = {
    prose: {
      '2.need': 'Need a wireless telemetry link over 500m in an urban campus setting.',
      '3.selected': 'We selected FSK modulation over ASK because FSK provides superior noise immunity and constant envelope amplification under variable fading conditions.',
    },
    rows: {
      '5.blocks': [
        { id: '1', v: { block: 'RF Transceiver (SX1278)', inputs: 'SPI data', outputs: '433MHz FSK RF' } },
      ],
      '6.bom': [
        { id: '1', v: { part: 'SX1278', value: '433MHz' } },
      ],
    },
    evidence: [],
  }

  const project = buildStructuredProject(commPortfolio)
  assert.ok(project.detectedEceDomains?.includes('communication_systems') || project.detectedEceDomains?.includes('rf_microwave'))

  // Verify sound trade-off reasoning
  const tradeOffReply = {
    verdict: 'resolved',
    reply: 'Your choice of FSK for constant envelope amplification and noise immunity is sound.',
    justificationEvaluation: 'Valid communication system modulation trade-off.',
  }
  const normalized = validateAndNormalizeVerdict(tradeOffReply, commPortfolio.prose['3.selected'])
  assert.strictEqual(normalized.verdict, 'resolved')
})

// ============================================================================
// TEST 27: ECE Domain 4 — IoT Application (Power Tree & Battery Budget)
// ============================================================================
test('27. ECE Domain 4: IoT application power tree synthesis and linear regulator dissipation', () => {
  const iotPortfolio = {
    prose: {
      '2.need': 'Need a solar-powered environmental monitor reporting temperature and humidity over Wi-Fi.',
      '3.selected': 'ESP32 microcontroller with BME280 sensor operating on 3.3V rail powered by 5V solar input via LM7805 regulator.',
    },
    rows: {
      '2.inputs': [
        { id: '1', v: { parameter: 'Solar panel input voltage', value: '12V', provenance: 'measured' } },
      ],
      '6.bom': [
        { id: '1', v: { part: 'ESP32', value: '3.3V' } },
        { id: '2', v: { part: 'LM7805', value: '5V' } },
      ],
    },
    evidence: [],
  }

  const project = buildStructuredProject(iotPortfolio)
  assert.ok(project.powerTree?.regulators.some((r) => r.part === 'LM7805'))
  assert.ok(project.powerTree?.supplyRails.includes('5V'))

  // Test regulator power dissipation calculation
  const pwrText = 'Regulator with Vin = 12V and Vout = 5V at Iload = 200mA has power dissipation Pd = 1.4W'
  const pwrCheck = checkDeterministicCalculation(pwrText)
  assert.strictEqual(pwrCheck.supported, true)
  assert.strictEqual(pwrCheck.isMathematicallyValid, true)
})

// ============================================================================
// TEST 28: ECE Domain 5 — DSP-Based Application (Nyquist & Quantization)
// ============================================================================
test('28. ECE Domain 5: DSP application sampling rate and anti-aliasing requirement', () => {
  const dspPortfolio = {
    prose: {
      '2.need': 'Digital audio spectrum analyzer covering human audible range up to 20 kHz.',
      '3.selected': 'Selected a sampling rate of 48 kHz with an active 4th-order Butterworth low-pass anti-aliasing filter with cutoff at 20 kHz.',
    },
    rows: {
      '4.frtable': [
        { id: '1', v: { no: 'FR-01', statement: 'Audio bandwidth 20 Hz to 20 kHz without aliasing', target: '20 kHz' } },
      ],
      '5.blocks': [
        { id: '1', v: { block: 'Microphone Preamp', inputs: 'Audio', outputs: 'Analog voltage' } },
        { id: '2', v: { block: 'Anti-Aliasing Filter', inputs: 'Analog voltage', outputs: 'Filtered 20kHz' } },
        { id: '3', v: { block: 'ADC', inputs: 'Filtered analog', outputs: '48kHz I2S samples' } },
        { id: '4', v: { block: 'DSP Core', inputs: 'I2S samples', outputs: 'FFT spectrum' } },
      ],
    },
    evidence: [],
  }

  const project = buildStructuredProject(dspPortfolio)
  assert.ok(project.detectedEceDomains?.includes('signal_processing'))
  assert.strictEqual(project.signalChain?.stages[1].stage, 'signal_conditioning')
  assert.strictEqual(project.signalChain?.stages[2].stage, 'conversion_adc')
})

// ============================================================================
// TEST 29: ECE Domain 6 — Microcontroller-Based Robotics (Interdisciplinary)
// ============================================================================
test('29. ECE Domain 6: Microcontroller robotics with mechanical motor interface', () => {
  const roboticsPortfolio = {
    prose: {
      '2.need': 'Two-wheeled mobile robot with differential drive and optical encoder odometry.',
      '3.selected': 'STM32F103 generates 20 kHz PWM signals driving an L298N dual H-bridge motor driver to control two 12V DC gear motors with 100 RPM output and 300 mA running current.',
    },
    rows: {
      '5.blocks': [
        { id: '1', v: { block: 'STM32 PWM', inputs: 'Encoder counts', outputs: '20kHz PWM' } },
        { id: '2', v: { block: 'L298N Driver', inputs: '20kHz PWM', outputs: '12V Motor Drive' } },
        { id: '3', v: { block: 'DC Gear Motor', inputs: '12V Motor Drive', outputs: 'Wheel torque and RPM' } },
      ],
      '6.bom': [
        { id: '1', v: { part: 'STM32F103', value: '72MHz' } },
        { id: '2', v: { part: 'L298N', value: 'Dual H-Bridge' } },
      ],
    },
    evidence: [],
  }

  const project = buildStructuredProject(roboticsPortfolio)
  assert.ok(project.interdisciplinaryDomains?.includes('mechanical'), 'Must detect mechanical interdisciplinary domain')
  assert.ok(project.detectedEceDomains?.includes('robotics_embedded_ai') || project.detectedEceDomains?.includes('embedded_systems'))

  // Valid trade-off test for 20 kHz PWM ultrasonic frequency
  const pwmTradeoff =
    'We chose a PWM frequency of 20 kHz because it is above the human audible range, preventing annoying motor acoustic whine, while keeping switching losses in the L298N manageable.'
  const normalized = validateAndNormalizeVerdict({ verdict: 'resolved', reply: 'Sound motor drive reasoning.' }, pwmTradeoff)
  assert.strictEqual(normalized.verdict, 'resolved')
})

// ============================================================================
// TEST 30: ECE Domain 7 — RF and Antenna Systems
// ============================================================================
test('30. ECE Domain 7: RF and antenna wavelength sizing and return loss S11', () => {
  // Test antenna calculation rule
  const antennaText = 'A quarter-wave monopole antenna for 2.4 GHz in air requires lambda/4 = 31.2 mm'
  const check = checkDeterministicCalculation(antennaText)
  assert.strictEqual(check.supported, true)
  assert.strictEqual(check.isMathematicallyValid, true)
  assert.strictEqual(check.ruleId, 'quarter_wave_antenna')

  // Discrepancy test: student claims 5 mm for 2.4 GHz monopole in air
  const wrongAntennaText = 'A quarter-wave monopole antenna for 2.4 GHz in air requires lambda/4 = 5.0 mm'
  const wrongCheck = checkDeterministicCalculation(wrongAntennaText)
  assert.strictEqual(wrongCheck.supported, true)
  assert.strictEqual(wrongCheck.isMathematicallyValid, false)
})

// ============================================================================
// TEST 31: ECE Domain 8 — VLSI / FPGA Digital Logic (RTL & Timing)
// ============================================================================
test('31. ECE Domain 8: VLSI / FPGA digital logic setup timing and FSM encoding', () => {
  const vlsiPortfolio = {
    prose: {
      '2.need': 'Hardware accelerated 16-bit MAC (Multiply-Accumulate) unit on Xilinx Artix-7 FPGA.',
      '3.selected': 'Designed a pipelined Verilog architecture with One-Hot FSM encoding to maximize clock frequency up to 100 MHz without setup time violations.',
    },
    rows: {
      '5.blocks': [
        { id: '1', v: { block: 'Pipelined Multiplier', inputs: '16-bit operands', outputs: '32-bit product' } },
        { id: '2', v: { block: 'Accumulator Register', inputs: '32-bit product', outputs: '40-bit accumulator' } },
      ],
      '6.bom': [
        { id: '1', v: { part: 'XC7A35T', value: 'Artix-7 FPGA' } },
      ],
    },
    evidence: [],
  }

  const project = buildStructuredProject(vlsiPortfolio)
  assert.ok(project.detectedEceDomains?.includes('vlsi_semiconductor') || project.detectedEceDomains?.includes('digital_logic'))

  // Valid trade-off: One-hot vs binary encoding on FPGA
  const fsmTradeoff =
    'We chose One-Hot encoding for the FSM because FPGAs have abundant flip-flops, and One-Hot simplifies combinatorial next-state logic to single-LUT paths, allowing the design to meet our 100 MHz timing constraint with positive setup slack.'
  const normalized = validateAndNormalizeVerdict({ verdict: 'resolved', reply: 'Sound FPGA architecture reasoning.' }, fsmTradeoff)
  assert.strictEqual(normalized.verdict, 'resolved')
})

// ============================================================================
// TEST 32: ECE Domain 9 — Biomedical Instrumentation (Interdisciplinary)
// ============================================================================
test('32. ECE Domain 9: Biomedical ECG instrumentation front-end and physical plausibility', () => {
  const bioPortfolio = {
    prose: {
      '2.need': 'Non-invasive Lead-I ECG heart monitoring system with Bluetooth Low Energy telemetry.',
      '3.selected': 'Instrumentation amplifier with Driven Right Leg (RLD) circuit providing >90 dB CMRR, followed by 50 Hz active notch filter and BLE microcontroller.',
    },
    rows: {
      '5.blocks': [
        { id: '1', v: { block: 'Skin Electrodes', inputs: 'Biopotential', outputs: 'Differential 1mV ECG' } },
        { id: '2', v: { block: 'INA333 Biopotential Amp', inputs: 'Differential 1mV', outputs: '0.5V ECG signal' } },
        { id: '3', v: { block: '50Hz Notch Filter', inputs: '0.5V ECG', outputs: 'Clean ECG signal' } },
        { id: '4', v: { block: 'ADC and BLE MCU', inputs: 'Clean ECG', outputs: 'BLE telemetry' } },
      ],
      '6.bom': [
        { id: '1', v: { part: 'INA333', value: 'Micro-power Instrumentation Amp' } },
      ],
    },
    evidence: [],
  }

  const project = buildStructuredProject(bioPortfolio)
  assert.ok(project.interdisciplinaryDomains?.includes('biomedical'))
  assert.ok(project.detectedEceDomains?.includes('biomedical_electronics') || project.detectedEceDomains?.includes('analog_circuits'))

  // Test physical plausibility check: student claiming raw unamplified ECG is 5V
  const impossibleBioClaim = 'The raw ECG signal from the patient chest electrodes is 5V, so it feeds the ADC directly.'
  const claimCheck = analyzeTechnicalClaims(impossibleBioClaim)
  assert.strictEqual(claimCheck.hasImplausibleValue, true)
  assert.strictEqual(claimCheck.verdict, 'physically_implausible')

  // Valid RLD and CMRR trade-off
  const rldJustification =
    'We incorporated a Driven Right Leg (RLD) circuit with the INA333 instrumentation amplifier because body common-mode mains interference at 50 Hz can be several volts, and RLD actively inverts and injects this common-mode voltage back to reduce interference and achieve over 90 dB effective CMRR.'
  const normalized = validateAndNormalizeVerdict({ verdict: 'resolved', reply: 'Excellent biomedical instrumentation reasoning.' }, rldJustification)
  assert.strictEqual(normalized.verdict, 'resolved')
})
