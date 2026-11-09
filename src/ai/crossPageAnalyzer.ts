import type { StructuredProject, CrossPageFinding } from './types'

/**
 * Performs evidence-based cross-page analysis across the student's submission.
 * Every finding links two explicit source locations (Page A & Page B) and explains
 * the physical/engineering discrepancy.
 * 
 * CRITICAL RULE: Never mistake missing information for a contradiction.
 * A contradiction requires two conflicting stated facts.
 */
export function analyzeCrossPageConsistency(project: StructuredProject): CrossPageFinding[] {
  const findings: CrossPageFinding[] = []

  // Set of valid FR numbers defined in Page 04
  const frMap = new Map<string, { statement: string; target: string }>()
  for (const fr of project.requirements ?? []) {
    if (fr.no) {
      frMap.set(fr.no.trim().toUpperCase(), {
        statement: fr.statement,
        target: fr.target,
      })
    }
  }

  // 1. Traceability: Dangling FR References in Blocks (Page 5) vs FR Table (Page 4)
  if (frMap.size > 0 && project.architecture?.blocks) {
    for (const b of project.architecture.blocks) {
      if (b.fr) {
        const cited = b.fr.trim().toUpperCase()
        if (!frMap.has(cited)) {
          findings.push({
            type: 'traceability',
            severity: 'warning',
            pageA: {
              id: 5,
              title: 'Architecture and Subsystems',
              sectionId: 'blocks',
              excerpt: `Block "${b.block}" cites governing requirement "${b.fr}"`,
            },
            pageB: {
              id: 4,
              title: 'Functional Requirements',
              sectionId: 'frtable',
              excerpt: `Requirements Table defines: ${Array.from(frMap.keys()).join(', ')}`,
            },
            explanation: `Block "${b.block}" references "${b.fr}", which does not exist in the Page 04 Functional Requirements Table.`,
            engineeringImpact: 'Breaks functional traceability. The block cannot be verified against an undefined requirement specification.',
          })
        }
      }
    }
  }

  // 2. Traceability: Dangling FR References in Calculations (Page 6) vs FR Table (Page 4)
  if (frMap.size > 0 && project.calculations) {
    for (const cl of project.calculations) {
      if (cl.fr) {
        const cited = cl.fr.trim().toUpperCase()
        if (!frMap.has(cited)) {
          findings.push({
            type: 'traceability',
            severity: 'warning',
            pageA: {
              id: 6,
              title: 'Design and Calculations',
              sectionId: 'calcs',
              excerpt: `Calculation "${cl.title}" is linked to "${cl.fr}"`,
            },
            pageB: {
              id: 4,
              title: 'Functional Requirements',
              sectionId: 'frtable',
              excerpt: `Requirements Table defines: ${Array.from(frMap.keys()).join(', ')}`,
            },
            explanation: `Calculation "${cl.title}" cites "${cl.fr}", which is missing from the Page 04 Functional Requirements Table.`,
            engineeringImpact: 'The design derivation is sized against an untracked requirement target.',
          })
        }
      }
    }
  }

  // 3. Contradiction: Operating Voltage / Supply Rail Discrepancy
  // Compare Page 2 design inputs with Page 6 BOM or calculation assumptions
  const supplyInput = project.problemNeed?.designInputs.find(
    (inp) => /supply|rail|voltage|vcc|vdd/i.test(inp.parameter) && inp.value,
  )

  if (supplyInput) {
    // Check BOM or Component reasons for voltage discrepancies
    for (const b of project.bom ?? []) {
      const bomText = `${b.part} ${b.value || ''}`
      // If Page 2 says +/- 5V or 3.3V, but BOM specifies 12V or 24V component without a converter
      if (/\b12\s*V\b/i.test(bomText) && /\b(3\.3|5)\s*V\b/i.test(supplyInput.value) && !/regulator|buck|boost|step/i.test(bomText)) {
        findings.push({
          type: 'contradiction',
          severity: 'critical',
          pageA: {
            id: 2,
            title: 'Problem and Need',
            sectionId: 'inputs',
            excerpt: `Design Input "${supplyInput.parameter}": "${supplyInput.value}"`,
          },
          pageB: {
            id: 6,
            title: 'Design and Calculations',
            sectionId: 'bom',
            excerpt: `BOM part "${b.part}": "${b.value}"`,
          },
          explanation: `Page 02 specifies operating supply rail as "${supplyInput.value}", but Page 06 BOM lists a 12V component without showing an intermediate step-up or regulation stage.`,
          engineeringImpact: 'Voltage rail mismatch can lead to under-voltage failure or device damage if unlevelled.',
        })
      }
    }
  }

  // 4. Contradiction: Calculation Predicted Value vs Validation Predicted Column
  // Page 06 Calcs vs Page 09 Validation
  if (project.calculations.length > 0 && project.validation.length > 0) {
    for (const val of project.validation) {
      if (!val.fr) continue
      const matchingCalc = project.calculations.find(
        (cl) => cl.fr?.trim().toUpperCase() === val.fr.trim().toUpperCase() && cl.result,
      )
      if (matchingCalc && val.predicted) {
        // Simple numeric extraction check
        const calcNums = matchingCalc.result.match(/\d+(?:\.\d+)?/g)
        const valNums = val.predicted.match(/\d+(?:\.\d+)?/g)
        if (calcNums && valNums) {
          const calcVal = parseFloat(calcNums[0])
          const valPred = parseFloat(valNums[0])
          // If orders of magnitude different (> 50% deviation between predicted in calc vs predicted in validation)
          if (calcVal > 0 && valPred > 0) {
            const ratio = calcVal / valPred
            if (ratio > 2.0 || ratio < 0.5) {
              findings.push({
                type: 'contradiction',
                severity: 'warning',
                pageA: {
                  id: 6,
                  title: 'Design and Calculations',
                  sectionId: 'calcs',
                  excerpt: `Calculation "${matchingCalc.title}" predicts result: "${matchingCalc.result}"`,
                },
                pageB: {
                  id: 9,
                  title: 'Predicted vs Measured',
                  sectionId: 'validation',
                  excerpt: `Validation row for "${val.fr}" records predicted value: "${val.predicted}"`,
                },
                explanation: `Page 06 calculated a predicted value of "${matchingCalc.result}", but Page 09 validation records a different prediction of "${val.predicted}" for the same requirement (${val.fr}).`,
                engineeringImpact: 'Discrepancy in pre-test prediction indicates either revised calculation without updating Page 06, or inaccurate bench test planning.',
              })
            }
          }
        }
      }
    }
  }

  return findings
}

