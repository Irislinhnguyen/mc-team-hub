/**
 * Question File Parsers
 * Supports CSV and XML formats for importing questions
 *
 * CSV Format:
 * type,question,choices,items,zones,correct,points
 * essay,"Write about X",,,,
 * cloze,"Capital of {1} is {2}",Paris|London|Berlin,,,2
 * drag_drop,"Match items",Item1|Item2,Zone1|Zone2,"Item1->Zone1,Item2->Zone2",5
 *
 * XML Format: Moodle-compatible
 */

import type {
  ParsedQuestionFile,
  ParsedQuestion,
  ParseError,
  QuestionType,
  QuestionOptions,
  ClozeQuestionOptions,
  ClozeGap,
  DragDropQuestionOptions,
  DraggableItem,
  DropZone,
  EssayQuestionOptions,
} from '@/lib/types/challenge'

// =====================================================
// CSV Parser
// =====================================================

/**
 * Parse CSV file containing questions
 */
export async function parseQuestionsCSV(csvText: string): Promise<ParsedQuestionFile> {
  const lines = csvText.split('\n').filter((l) => l.trim())
  if (lines.length < 2) {
    return { questions: [], errors: [{ row: 0, field: 'file', message: 'File is empty or missing header' }] }
  }

  const questions: ParsedQuestion[] = []
  const errors: ParseError[] = []

  // Parse header (case-insensitive)
  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim())
  const headerMap = new Map<string, number>()
  header.forEach((h, i) => headerMap.set(h, i))

  // Validate required columns
  const requiredCols = ['type', 'question']
  for (const col of requiredCols) {
    if (!headerMap.has(col)) {
      errors.push({ row: 1, field: 'header', message: `Missing required column: ${col}` })
    }
  }

  if (errors.length > 0) {
    return { questions, errors }
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    try {
      const row = parseCSVLine(line)
      const rowData: Record<string, string> = {}

      header.forEach((colName, idx) => {
        if (row[idx] !== undefined) {
          rowData[colName] = row[idx]
        }
      })

      const question = mapRowToQuestion(rowData, i + 1)
      if (question) {
        questions.push(question)
      }
    } catch (error: any) {
      errors.push({
        row: i + 1,
        field: 'general',
        message: error.message || 'Unknown error',
      })
    }
  }

  return { questions, errors }
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      // Check for escaped quote
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * Map a CSV row to a ParsedQuestion
 */
function mapRowToQuestion(row: Record<string, string>, rowNumber: number): ParsedQuestion | null {
  const type = row.type?.toLowerCase().trim() as QuestionType

  if (!type || !['essay', 'cloze', 'drag_drop'].includes(type)) {
    throw new Error(`Invalid question type: "${type}". Must be one of: essay, cloze, drag_drop`)
  }

  const question = row.question?.trim()
  if (!question) {
    throw new Error('Question text is required')
  }

  const points = row.points ? parseInt(row.points) : 1

  switch (type) {
    case 'essay':
      return {
        type: 'essay',
        question_text: question,
        options: { type: 'essay' } as EssayQuestionOptions,
        points,
      }

    case 'cloze':
      return parseClozeQuestionRow(row, question, points, rowNumber)

    case 'drag_drop':
      return parseDragDropQuestionRow(row, question, points, rowNumber)

    default:
      return null
  }
}

/**
 * Parse a cloze question from CSV row
 *
 * Supports two formats:
 * 1. Embedded format: "The capital of {1:Paris} is..."
 * 2. Separate column: "The capital of {1} is..." with choices in 'choices' column
 */
function parseClozeQuestionRow(
  row: Record<string, string>,
  questionText: string,
  points: number,
  rowNumber: number
): ParsedQuestion {
  const choicesStr = row.choices || ''
  const choices = choicesStr ? choicesStr.split('|').map((c) => c.trim()) : []

  // Find all gaps marked as {1}, {2}, etc. or {1:Answer}
  const gapRegex = /\{(\d+)(?::([^}]*))?\}/g
  const gaps: ClozeGap[] = []
  let match: RegExpExecArray | null
  let gapIndex = 0

  while ((match = gapRegex.exec(questionText)) !== null) {
    const gapNumber = parseInt(match[1])
    const embeddedAnswer = match[2] // The part after colon, if present

    let gapChoices: string[]
    let correctIndex = 0

    if (embeddedAnswer) {
      // Format: {1:Paris} - embedded answer
      // Parse embedded choices if multiple separated by ~
      const embeddedChoices = embeddedAnswer.split('~').map((c) => c.trim())
      // First choice is correct (Moodle convention)
      gapChoices = embeddedChoices.length > 1 ? embeddedChoices : [...choices]
      correctIndex = 0
    } else {
      // Format: {1} - use choices column
      gapChoices = choices
      correctIndex = 0
    }

    gaps.push({
      id: `gap-${gapNumber}`,
      choices: gapChoices.filter((c) => c.length > 0),
      correct_index: correctIndex,
      shuffle: true,
    })

    gapIndex++
  }

  if (gaps.length === 0) {
    throw new Error('No valid gaps found in cloze question. Use format: {1} or {1:Answer}')
  }

  // Clean the question text for display (remove embedded answers)
  const cleanText = questionText.replace(/\{(\d+):[^}]*\}/g, '{$1}')

  return {
    type: 'cloze',
    question_text: cleanText,
    options: {
      type: 'cloze',
      gaps,
    } as ClozeQuestionOptions,
    points,
  }
}

/**
 * Parse a drag-drop question from CSV row
 *
 * Format:
 * - items: Pipe-separated items "Item1|Item2|Item3"
 * - zones: Pipe-separated zones "Zone1|Zone2"
 * - correct: Mapping "Item1->Zone1,Item2->Zone2"
 */
function parseDragDropQuestionRow(
  row: Record<string, string>,
  questionText: string,
  points: number,
  rowNumber: number
): ParsedQuestion {
  const itemsStr = row.items || ''
  const zonesStr = row.zones || ''
  const correctStr = row.correct || ''

  if (!itemsStr || !zonesStr) {
    throw new Error('Drag-drop questions require "items" and "zones" columns')
  }

  const items: DraggableItem[] = itemsStr
    .split('|')
    .map((content, id) => ({
      id: `item-${id}`,
      content: content.trim(),
    }))
    .filter((item) => item.content.length > 0)

  const zones: DropZone[] = zonesStr
    .split('|')
    .map((label, id) => ({
      id: `zone-${id}`,
      label: label.trim(),
      correct_item_ids: [],
    }))
    .filter((zone) => zone.label.length > 0)

  if (items.length === 0) {
    throw new Error('At least one item is required')
  }

  if (zones.length === 0) {
    throw new Error('At least one zone is required')
  }

  // Parse correct mapping: "Item1->Zone1,Item2->Zone2"
  // or by index: "0->0,1->1" (item index -> zone index)
  if (correctStr) {
    const mappings = correctStr.split(',')
    for (const mapping of mappings) {
      const parts = mapping.split('->')
      if (parts.length !== 2) continue

      const itemRef = parts[0].trim()
      const zoneRef = parts[1].trim()

      // Find zone by label or index
      const zoneIndex = parseInt(zoneRef)
      const zone =
        zoneIndex >= 0 && zoneIndex < zones.length
          ? zones[zoneIndex]
          : zones.find((z) => z.label === zoneRef)

      if (zone) {
        // Find item by content or index
        const itemIndex = parseInt(itemRef)
        const item =
          itemIndex >= 0 && itemIndex < items.length
            ? items[itemIndex]
            : items.find((i) => i.content === itemRef)

        if (item) {
          zone.correct_item_ids.push(item.id)
        }
      }
    }
  }

  return {
    type: 'drag_drop',
    question_text: questionText,
    options: {
      type: 'drag_drop',
      items,
      zones,
      allow_multiple_items_per_zone: false,
    } as DragDropQuestionOptions,
    points,
  }
}

// =====================================================
// XML Parser (Moodle-compatible)
// =====================================================

/**
 * Parse XML file containing questions (Moodle format)
 *
 * Basic implementation for Moodle quiz export format
 */
export async function parseQuestionsXML(xmlText: string): Promise<ParsedQuestionFile> {
  const questions: ParsedQuestion[] = []
  const errors: ParseError[] = []

  try {
    // Simple XML parser for Moodle format
    // In production, use a proper XML parser
    const questionMatches = xmlText.match(/<question[^>]*type="([^"]+)"[^>]*>[\s\S]*?<\/question>/gi)

    if (!questionMatches) {
      return {
        questions: [],
        errors: [{ row: 0, field: 'xml', message: 'No questions found in XML' }],
      }
    }

    questionMatches.forEach((questionBlock, index) => {
      try {
        const typeMatch = questionBlock.match(/type="([^"]+)"/)
        const type = typeMatch ? typeMatch[1].toLowerCase() : ''

        // Extract question text
        const textMatch = questionBlock.match(/<questiontext><text><!\[CDATA\[([\s\S]*?)\]\]><\/text><\/questiontext>/)
        const questionText = textMatch ? textMatch[1].trim() : ''

        // Extract default mark (points)
        const pointsMatch = questionBlock.match(/<defaultmark>([^<]+)<\/defaultmark>/)
        const points = pointsMatch ? parseFloat(pointsMatch[1]) : 1

        if (!questionText) {
          errors.push({
            row: index + 1,
            field: 'question',
            message: 'Question text is empty',
          })
          return
        }

        // Parse based on type
        if (type === 'essay') {
          questions.push({
            type: 'essay',
            question_text: questionText,
            options: { type: 'essay' },
            points,
          })
        } else if (type === 'cloze' || type === 'multianswer') {
          // Parse Moodle cloze format
          questions.push(parseMoodleClozeXML(questionBlock, questionText, points, index + 1))
        } else if (type === 'ddmatch' || type === 'draganddrop') {
          // Parse drag-drop format
          questions.push(parseMoodleDragDropXML(questionBlock, questionText, points, index + 1))
        } else {
          errors.push({
            row: index + 1,
            field: 'type',
            message: `Unsupported question type: ${type}`,
          })
        }
      } catch (error: any) {
        errors.push({
          row: index + 1,
          field: 'general',
          message: error.message || 'Failed to parse question',
        })
      }
    })
  } catch (error: any) {
    errors.push({
      row: 0,
      field: 'xml',
      message: error.message || 'Invalid XML format',
    })
  }

  return { questions, errors }
}

/**
 * Parse Moodle cloze question from XML
 */
function parseMoodleClozeXML(
  xmlBlock: string,
  questionText: string,
  points: number,
  rowNumber: number
): ParsedQuestion {
  const gaps: ClozeGap[] = []

  // Moodle cloze format: {1:SHORTANSWER:Paris#Feedback...}
  // Simplified regex to extract gaps
  const gapRegex = /\{(\d+):([^:]+):([^#}]+)(?:#[^}]*)?\}/g
  let match: RegExpExecArray | null
  let gapIndex = 0

  while ((match = gapRegex.exec(questionText)) !== null) {
    const gapNumber = parseInt(match[1])
    const gapType = match[2] // SHORTANSWER, MULTICHOICE, etc.
    const answerStr = match[3] // Correct answer(s)

    // Parse multiple choice answers if present (e.g., "Paris~London~Berlin")
    const choices = answerStr.split('~').map((c) => c.trim())

    gaps.push({
      id: `gap-${gapNumber}`,
      choices,
      correct_index: 0, // First choice is correct in Moodle
      shuffle: true,
    })

    gapIndex++
  }

  // Clean question text (remove Moodle markup)
  const cleanText = questionText.replace(/\{(\d+):[^}]*\}/g, '{$1}')

  return {
    type: 'cloze',
    question_text: cleanText,
    options: { type: 'cloze', gaps },
    points,
  }
}

/**
 * Parse Moodle drag-drop question from XML
 */
function parseMoodleDragDropXML(
  xmlBlock: string,
  questionText: string,
  points: number,
  rowNumber: number
): ParsedQuestion {
  // Extract drag items
  const dragMatches = xmlBlock.matchAll(/<drag><text><!\[CDATA\[([\s\S]*?)\]\]><\/text><\/drag>/gi)
  const items: DraggableItem[] = []

  let dragIndex = 0
  for (const match of dragMatches) {
    items.push({
      id: `item-${dragIndex++}`,
      content: match[1].trim(),
    })
  }

  // Extract drop zones
  const dropMatches = xmlBlock.matchAll(/<drop><text><!\[CDATA\[([\s\S]*?)\]\]><\/text><\/drop>/gi)
  const zones: DropZone[] = []

  let dropIndex = 0
  for (const match of dropMatches) {
    zones.push({
      id: `zone-${dropIndex++}`,
      label: match[1].trim(),
      correct_item_ids: [],
    })
  }

  return {
    type: 'drag_drop',
    question_text: questionText,
    options: {
      type: 'drag_drop',
      items,
      zones,
      allow_multiple_items_per_zone: false,
    },
    points,
  }
}

// =====================================================
// Export Functions
// =====================================================

export {
  parseCSVLine,
  mapRowToQuestion,
  parseClozeQuestionRow,
  parseDragDropQuestionRow,
}
