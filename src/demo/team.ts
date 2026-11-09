import { THEMES, type ReviewId } from '../data/handbook'
import type { Member } from '../data/team'

/** DEMO DATA ONLY — fictional team, used solely by demo mode (presentations). Never shown to real students. */
export function demoTeam(studentName: string) {
  const theme = THEMES[0]
  return {
    id: 'demo',
    name: 'Team Delta',
    isDemo: true,
    theme,
    artefact: theme.artefacts[0],
    currentReview: 'R2' as ReviewId,
    mentor: 'Prof. A. Joshi (demo)' as string | null,
    members: [
      { id: 'm1', name: studentName, subsystem: 'Analog gain stage', role: 'Portfolio Lead' },
      { id: 'm2', name: 'Meera Hegde', subsystem: 'FPGA gain-select logic' },
      { id: 'm3', name: 'Rohan Patil', subsystem: 'Measurement and test setup' },
      { id: 'm4', name: 'Sneha Desai', subsystem: 'Power and signal conditioning' },
    ] as Member[],
  }
}
