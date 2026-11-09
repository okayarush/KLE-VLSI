import type { ComponentType } from 'react'
import { HomeOv, TeamOv, NeedOv, ConceptOv } from './group1'
import { FrOv, ArchOv, CalcOv, MapOv } from './group2'
import { BuildOv, ValidationOv, FailOv, NotebookOv } from './group3'
import { ReviewOv, ReflectOv, DemoOv, FilesOv } from './group4'
import type { OvProps } from './kit'

export const PAGE_OVERVIEWS: Record<number, ComponentType<OvProps>> = {
  0: HomeOv,
  1: TeamOv,
  2: NeedOv,
  3: ConceptOv,
  4: FrOv,
  5: ArchOv,
  6: CalcOv,
  7: MapOv,
  8: BuildOv,
  9: ValidationOv,
  10: FailOv,
  11: NotebookOv,
  12: ReviewOv,
  13: ReflectOv,
  14: DemoOv,
  15: FilesOv,
}

export { PageArt } from './art'
export type { OvProps } from './kit'

