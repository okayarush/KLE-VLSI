/**
 * Handbook-derived static data. Sources: PROJECT_REQUIREMENTS.md §4.2, §5.1, §5.3 (verbatim names).
 * Nothing here is invented: where the documents mark something [DERIVED] it is flagged.
 */

export interface DesignStep { n: number; name: string; short: string; star?: boolean }

/** The 16-step design chain — Handbook §5.2. ★ = steps added July 2026. */
export const STEPS: DesignStep[] = [
  { n: 1, name: 'Problem / Need Definition', short: 'Need' },
  { n: 2, name: 'Concept Generation & Selection', short: 'Concept', star: true },
  { n: 3, name: 'Functional Requirements', short: 'Requirements', star: true },
  { n: 4, name: 'Functional Architecture', short: 'Architecture' },
  { n: 5, name: 'Subsystem Design', short: 'Subsystems', star: true },
  { n: 6, name: 'Circuit and RTL Design', short: 'Circuit / RTL' },
  { n: 7, name: 'Engineering Calculations', short: 'Calculations' },
  { n: 8, name: 'Component and Device Selection', short: 'Components' },
  { n: 9, name: 'Schematic, Layout and Constraint Capture', short: 'Schematic' },
  { n: 10, name: 'Simulation, RTL Coding and Firmware', short: 'Simulation' },
  { n: 11, name: 'Subsystem Testing', short: 'Subsystem test' },
  { n: 12, name: 'System Integration', short: 'Integration' },
  { n: 13, name: 'Performance Validation', short: 'Validation' },
  { n: 14, name: 'Debugging & Documented Improvement', short: 'Debugging' },
  { n: 15, name: 'Technical Documentation', short: 'Documentation' },
  { n: 16, name: 'Final Demonstration', short: 'Demo' },
]

export type ReviewId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'FINAL'

export interface Review { id: ReviewId; label: string; name: string; newPages: number[]; evidence: string }

/** Review release flow — Proposal §4 via PROJECT_REQUIREMENTS §4.2. Pages shown are the ones that go live *at* that review. */
export const REVIEWS: Review[] = [
  { id: 'R1', label: 'Review 1', name: 'Theme Approval', newPages: [0, 1, 2, 11, 12], evidence: 'Need, sourced design inputs, 3 candidate FRs, first Notebook entry, portfolio shared with mentor' },
  { id: 'R2', label: 'Review 2', name: 'Concept Selection', newPages: [3], evidence: '3 alternatives, sketches, comparison matrix, rejected options, response to R1 feedback' },
  { id: 'R3', label: 'Review 3', name: 'FR & Architecture', newPages: [4, 5, 7], evidence: 'Frozen FR table, block diagram, subsystem alternatives, first Applied-level decision cards' },
  { id: 'R4', label: 'Review 4', name: 'Component Design & Calculations', newPages: [6], evidence: 'FR-linked calculations, schematic, constraints, BOM, critical-block simulation, dated predictions' },
  { id: 'R5', label: 'Review 5', name: 'Build, Simulation & Debugging', newPages: [8, 10], evidence: 'Build evidence, testbench/subsystem records, failure cycles with root cause, explained deviations' },
  { id: 'FINAL', label: 'Final Review', name: 'Validation & Viva', newPages: [9, 13, 14, 15], evidence: 'Predicted vs measured for every FR, improvement re-measured, failure cycles, Verified decision cards, reflections, demo, project links' },
]

export const reviewIndex = (id: ReviewId) => REVIEWS.findIndex((r) => r.id === id)

/** Review at which a page first goes live. */
export function firstReviewOf(pageId: number): Review {
  return REVIEWS.find((r) => r.newPages.includes(pageId)) ?? REVIEWS[0]
}

/** Pages expected live at (cumulative up to and including) a review. */
export function pagesLiveAt(id: ReviewId): number[] {
  return REVIEWS.slice(0, reviewIndex(id) + 1).flatMap((r) => r.newPages)
}

/** Handbook Chapter 3: six themes × four artefacts. Subtitles verbatim (PROJECT_REQUIREMENTS §5.1). */
export interface Theme { n: number; name: string; subtitle: string; artefacts: string[] }
export const THEMES: Theme[] = [
  { n: 1, name: 'Programmable Analog Gain Systems', subtitle: 'Amplifier biasing, small-signal gain, gain–bandwidth trade-off, loading effects, and digitally selected gain control.', artefacts: ['FPGA-Controlled Variable Gain Amplifier', 'Digitally Switched Instrumentation Amplifier Front-End', 'Programmable-Gain Sensor Signal Conditioner', 'Digitally Controlled Active Filter with Gain Stage'] },
  { n: 2, name: 'Serial Protocol Interface Systems', subtitle: 'Protocol framing, baud and clock generation, clock-domain synchronisation, and physical-layer characterisation.', artefacts: ['RTL UART Transceiver with Physical-Layer Characterisation', 'SPI Master Interface System', 'I2C Controller Interface System', 'High-Speed Serial-to-Parallel and Parallel-to-Serial Interface'] },
  { n: 3, name: 'Data Buffering and Timing Closure Systems', subtitle: 'Storage-element design, pointer and flag logic, producer–consumer rate matching, and the separation of functional correctness from timing correctness.', artefacts: ['Synchronous FIFO with Timing and Functional Verification', 'Dual-Clock Asynchronous FIFO System', 'Memory-Mapped Register Bank with Read/Write Interface', 'Serial-to-Parallel Data Pipeline with Buffering'] },
  { n: 4, name: 'Control–Datapath RTL Systems', subtitle: 'FSM and datapath partitioning, state encoding trade-offs, combinational complexity, metastability, and synchroniser design.', artefacts: ['FSM-Plus-Datapath Arithmetic Unit', 'Sequence Detector and Protocol Controller', 'Multi-Stage Process Sequencing Controller', 'Input Synchroniser and Metastability Characterisation System'] },
  { n: 5, name: 'Embedded Real-Time Control Systems', subtitle: 'Interrupt-driven control, real-time task scheduling, peripheral register configuration, and timing determinism.', artefacts: ['Interrupt-Driven Multi-Task Embedded Controller', 'Timer-Based Periodic Data Acquisition System', 'Real-Time Multi-Sensor Data Acquisition System', 'Priority-Based Task Scheduler with Deadline Monitoring'] },
  { n: 6, name: 'Automation and Display Control Systems', subtitle: 'Peripheral interfacing, display driver logic, automation sequencing, and finite-state-machine-based control.', artefacts: ['FSM-Based Automation Sequencer with Status Display', 'Multiplexed Display Driver System', 'Sensor-Triggered Actuator Control Panel', 'Serial Bus Display and Peripheral Interface System'] },
]

/** FR status values — exact wording, PROJECT_REQUIREMENTS §5.4 / DESIGN_GUIDELINES Page 4. */
export const FR_STATUSES = [
  'Target confirmed and sizes calculation',
  'Under review — team not yet able to size this requirement',
  'Deferred with reason',
]
export const FR_SOURCES = ['User need', 'Theme specification', 'Device datasheet', 'Design standard']

export const INSTITUTION = {
  university: 'KLE Technological University',
  city: 'Hubballi',
  school: 'School of Electrical and Electronics Engineering',
  department: 'Department of Electronics Engineering – VLSI Design and Technology',
  /** Handbook is common to both departments (PROJECT_REQUIREMENTS §1 / A-17). */
  departments: ['Electronics and Communication Engineering', 'Electronics Engineering – VLSI Design and Technology'],
  programme: 'Foundation Integration Mini Project',
  year: 'Academic Year 2026–27 · Semester V',
}
