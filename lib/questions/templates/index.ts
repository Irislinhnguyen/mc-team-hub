export { checkAndExplainTemplate } from './checkAndExplain'
export { compareTemplate } from './compare'
export { rankTemplate } from './rank'
export { suggestTemplate } from './suggest'
export { personalTemplate } from './personal'

export * from './types'

import { checkAndExplainTemplate } from './checkAndExplain'
import { compareTemplate } from './compare'
import { rankTemplate } from './rank'
import { suggestTemplate } from './suggest'
import { personalTemplate } from './personal'
import { QuestionTemplate } from './types'

export const ALL_QUESTION_TEMPLATES: QuestionTemplate[] = [
  checkAndExplainTemplate,
  compareTemplate,
  rankTemplate,
  suggestTemplate,
  personalTemplate,
]

export function getTemplateById(id: string): QuestionTemplate | undefined {
  return ALL_QUESTION_TEMPLATES.find((t) => t.id === id)
}
