import type { IssueType, ThreadMsg } from '../state/store'
import type { Insight } from './engine'

// ============================================================================
// EVALUATION & LENS TYPES
// ============================================================================

export type EceSubDomain =
  | 'analog_circuits'
  | 'digital_logic'
  | 'embedded_systems'
  | 'iot_sensors'
  | 'communication_systems'
  | 'signal_processing'
  | 'rf_microwave'
  | 'antennas'
  | 'vlsi_semiconductor'
  | 'computer_architecture'
  | 'control_instrumentation'
  | 'power_electronics'
  | 'pcb_hardware'
  | 'robotics_embedded_ai'
  | 'biomedical_electronics'

export type InterdisciplinaryDomain =
  | 'mechanical'
  | 'biomedical'
  | 'software_ai'
  | 'civil_environmental'
  | 'chemical'
  | 'other'

export interface SignalChainNode {
  stage:
    | 'input_sensor'
    | 'signal_conditioning'
    | 'conversion_adc'
    | 'processing_mcu'
    | 'actuation_output'
    | 'transceiver_rf'
    | 'other'
  name: string
  block?: string
  inputSignal?: string
  outputSignal?: string
  keyComponents?: string[]
  nominalRange?: string
}

export interface SignalChainSummary {
  stages: SignalChainNode[]
  flowDescription: string
  identifiedMismatches: string[]
}

export interface PowerTreeSummary {
  primarySource?: string
  regulators: {
    part: string
    vin?: string
    vout?: string
    type: 'ldo' | 'buck' | 'boost' | 'linear' | 'unknown'
  }[]
  supplyRails: string[]
  estimatedCurrents: Record<string, string>
  potentialIssues: string[]
}

export type EvaluationState =
  | 'resolved'            // Satisfactorily demonstrated understanding with sound justification
  | 'needs_clarification' // Partially correct but missing critical steps, numbers, or assumptions
  | 'incorrect'           // Technical misconception, calculation error, or physical impossibility
  | 'non_answer'          // Refusal ("idk", "skip"), empty, evasive filler, or irrelevant text
  | 'needs_verification'  // Claim cannot be confirmed from available datasheets/context
  | 'unresolved'          // Topic closed without demonstrating required understanding

export type QuestionCategory =
  | 'determinate' // Governed by hard physical/mathematical laws (Ohm's law, ADC resolution, GBW)
  | 'tradeoff'    // Open-ended design decision with multiple valid approaches (component selection, architecture)
  | 'evidence'    // Empirical claim requiring test bench / datasheet proof ("achieved 95% accuracy", "stable")

export type EngineeringLens =
  | 'Functional Need'           // Does every choice trace to a quantified requirement?
  | 'Alternatives Considered'    // Were viable alternatives evaluated with sound criteria?
  | 'Mathematical Derivation'    // Are ratings/parameters derived from first principles?
  | 'Verification & Validation'  // Do test measurements support expected results?
  | 'Failure & Risk'             // Are failure modes and root causes understood?
  | 'Traceability'               // Does architecture trace to requirements and calculations?
  | 'Reflection & Learning'      // Does the student demonstrate genuine subsystem mastery?

// ============================================================================
// QUESTION METADATA & RATIONALE
// ============================================================================

export interface QuestionRationale {
  /** Verbatim excerpt from student text or table cell that triggered the question */
  triggerQuote?: string
  /** Section ID where the trigger quote or data was found */
  anchorSectionId?: string
  /** The engineering lens governing this question */
  lens: EngineeringLens
  /** Classification of the engineering question */
  category: QuestionCategory
  /** Specific engineering concept or principle being tested */
  conceptTested: string
  /** What a technically satisfactory answer must demonstrate */
  expectedDemonstration: string
  /** What information is currently missing from the student submission */
  missingInformation?: string
  /** Three progressive hints for scaffolding (concept -> formula -> substitution) */
  scaffoldingHints: [string, string, string]
}

export interface GeneratedQuestionItem {
  id?: string
  type: IssueType
  quote?: string
  text: string
  anchorSectionId?: string
  rationale?: QuestionRationale
}

export interface QuestionGenResponse {
  insufficient?: boolean
  reason?: string
  questions: GeneratedQuestionItem[]
}

// ============================================================================
// CONTEXT & CROSS-PAGE REPRESENTATION
// ============================================================================

export interface DesignInputItem {
  parameter: string
  value: string
  provenance: 'measured' | 'datasheet' | 'assumed' | string
  source?: string
}

export interface FunctionalRequirementItem {
  no: string
  statement: string
  target: string
  method: string
  source: string
  status: string
  reason?: string
}

export interface ConceptAlternativeItem {
  name: string
  idea: string
  pros?: string
  cons?: string
  fate?: 'Selected' | 'Rejected' | string
}

export interface ArchitectureBlockItem {
  block: string
  inputs?: string
  outputs?: string
  fr?: string
}

export interface CalculationCardItem {
  title: string
  fr?: string
  assumptions?: string
  working: string
  result: string
  course?: string
  date?: string
}

export interface BomItem {
  part: string
  value?: string
  qty?: string
  trace?: string
}

export interface ValidationItem {
  fr: string
  target?: string
  predicted: string
  measured: string
  deviation?: string
  explain?: string
  result?: 'Pass' | 'Fail' | string
}

export interface DebugItem {
  symptom: string
  test?: string
  cause: string
  fix?: string
  remeasure?: string
  learning?: string
  state?: 'Open' | 'Closed' | string
}

/** Structured representation of the entire student project (schema-aware & resilient to missing fields). */
export interface StructuredProject {
  title?: string
  themeName?: string
  declaredSubsystems: string[]
  problemNeed?: {
    statement?: string
    background?: string
    designInputs: DesignInputItem[]
    candidateFRs: { statement: string; target?: string; method?: string }[]
  }
  conceptChoices?: {
    alternatives: ConceptAlternativeItem[]
    comparisonSummary?: string
    selectedRationale?: string
    scope?: string
  }
  requirements: FunctionalRequirementItem[]
  architecture?: {
    blocks: ArchitectureBlockItem[]
    subsystemSelections: { block: string; alt?: string; choice?: string }[]
  }
  calculations: CalculationCardItem[]
  bom: BomItem[]
  componentReasons?: string
  integrationMap?: { decision: string; block?: string; fr?: string; calc?: string; measured?: string }[]
  verificationTests?: { parameter: string; instrument?: string; predicted?: string; measured?: string; remarks?: string }[]
  validation: ValidationItem[]
  failures: DebugItem[]
  notebookHighlights?: string[]
  reflections?: { member: string; text: string }[]
  evidenceCount: number
  evidenceSummary: { pageId: number; name: string; caption: string }[]
  signalChain?: SignalChainSummary
  powerTree?: PowerTreeSummary
  detectedEceDomains?: EceSubDomain[]
  interdisciplinaryDomains?: InterdisciplinaryDomain[]
}

/** Evidence-based cross-page relationship or contradiction */
export interface CrossPageFinding {
  type: 'traceability' | 'consistency' | 'contradiction' | 'unsupported_claim'
  severity: 'info' | 'warning' | 'critical'
  pageA: { id: number; title: string; sectionId?: string; excerpt: string }
  pageB: { id: number; title: string; sectionId?: string; excerpt: string }
  explanation: string
  engineeringImpact: string
}

/** Compact project digest for prompt injection without context blow-up */
export interface ProjectDigest {
  summary: string
  keyParameters: Record<string, string>
  activeFRs: string[]
  keyComponents: string[]
  crossPageFindings: CrossPageFinding[]
  signalChainFlow?: string
  powerTreeSummary?: string
  detectedDomains?: string[]
}

// ============================================================================
// PERSISTENT VIVA SESSION MEMORY
// ============================================================================

export interface SessionMemory {
  /** Concepts the student has satisfactorily demonstrated */
  conceptsMastered: string[]
  /** Concepts or formulas the student struggled with or exhibited misconceptions on */
  identifiedMisconceptions: string[]
  /** Facts and numerical parameters established during the conversation */
  establishedFacts: Record<string, string>
  /** Previous questions discussed and their final evaluation status */
  questionHistory: {
    questionText: string
    lens?: EngineeringLens
    status: EvaluationState
    turnsCount: number
  }[]
  /** Open contradictions noted between student answers and written documentation */
  notedContradictions: string[]
  /** Current scaffolding level if student requested help */
  scaffoldingLevel: number
}

// ============================================================================
// VIVA TURN REQUEST & RESPONSE CONTRACTS
// ============================================================================

export interface VivaTurnRequest {
  pageId: number
  pageTitle: string
  themeName?: string
  currentQuestion: {
    type: IssueType
    quote?: string
    text: string
    rationale?: QuestionRationale
  }
  history: ThreadMsg[]
  studentReply: string
  followupsCount: number
  projectDigest?: ProjectDigest
  sessionMemory?: SessionMemory
}

export interface VivaTurnVerdict {
  verdict: EvaluationState
  /** Conversational response from the mentor to the student */
  reply: string
  /** Faculty-facing note explaining the evaluation outcome */
  justificationEvaluation: string
  /** Whether a determinate calculation or physical law was violated */
  isDeterminateError?: boolean
  /** Details of the calculation error if determinate */
  calculationCheck?: {
    formulaUsed?: string
    studentValue?: string
    expectedValue?: string
    isCorrect: boolean
    discrepancyNote?: string
  }
  /** Specific concept or missing justification that was flagged */
  identifiedGap?: string
  /** Progressive hint to offer if the student struggled or requested a hint */
  suggestedHint?: string
  /** Updated session memory update patch */
  memoryPatch?: Partial<SessionMemory>
}

// ============================================================================
// EXISTING / LEGACY WRAPPER TYPES FOR BACKWARD COMPATIBILITY
// ============================================================================

export interface PageContentSummary {
  pageId: number
  pageTitle: string
  prose: Record<string, string>
  rows: Record<string, { id: string; v: Record<string, string> }[]>
  evidence: { name: string; caption: string }[]
  themeNo?: number
  themeName?: string
}

export interface QuestionGenRequest {
  pageId: number
  pageTitle: string
  content: PageContentSummary
  themeNo?: number
  themeName?: string
}

export interface PageAnalysisRequest {
  pageId: number
  pageTitle: string
  content: PageContentSummary
  themeNo?: number
}

export interface PageAnalysisResponse {
  insights: Insight[]
  suggestedImprovement: string
}

export interface PortfolioAnalysisRequest {
  pages: PageContentSummary[]
  reviewId: string
  themeNo?: number
}

export interface PortfolioAnalysisResponse {
  overall: Insight[]
  byPage: { pageId: number; insights: Insight[] }[]
  counts: Record<IssueType, number>
  inconsistencies: Insight[]
  missingEvidence: Insight[]
  improvements: string[]
}
