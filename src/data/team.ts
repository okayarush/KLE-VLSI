import type { ReviewId, Theme } from './handbook'

export interface Member { id: string; name: string; subsystem: string; role?: 'Portfolio Lead' }

/** The team a signed-in student works in. Real teams come from Supabase; the demo team lives in src/demo. */
export interface Team {
  id: string
  name: string
  isDemo: boolean
  theme: Theme
  artefact: string
  currentReview: ReviewId
  mentor: string | null
  members: Member[]
}
