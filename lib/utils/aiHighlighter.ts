import { colors } from '../colors'

/**
 * AI Text Highlighter - Adds semantic color highlighting to AI-generated text
 *
 * Highlights:
 * - Metrics (percentages, dollar amounts)
 * - Entities (Zone IDs, Publisher IDs, Media IDs)
 * - Names (in quotes)
 * - Action verbs
 * - Urgency indicators
 */

/**
 * Strip ALL HTML tags and inline styles from text using DOMParser
 * This handles malformed HTML/CSS that AI might generate
 * Using DOMParser is the recommended approach as it handles nested tags
 * and malformed HTML more gracefully than regex
 */
function stripAllHTML(html: string): string {
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      return doc.body.textContent || ''
    } catch (error) {
      console.warn('DOMParser failed, falling back to regex:', error)
      // Fallback to regex if DOMParser fails
      return html.replace(/<[^>]*>/g, '')
    }
  }
  // Fallback for environments without DOMParser
  return html.replace(/<[^>]*>/g, '')
}

const highlightColors = {
  // Metrics
  metric_positive: colors.status.success,
  metric_negative: colors.status.danger,
  metric_neutral: colors.text.secondary,

  // Entities
  entity_zone: colors.data.primary,
  entity_publisher: '#9333ea', // Purple
  entity_media: '#0891b2', // Teal
  entity_product: colors.main,

  // Actions & Urgency
  action_urgent: colors.status.danger,
  action_important: colors.status.warning,

  // Emphasis
  value_highlight: '#1f2937', // Dark gray
  background_highlight: '#fef3c7', // Light yellow
  urgency_background: 'rgba(239, 68, 68, 0.1)' // Light red
}

/**
 * Main highlighting function
 * Applies semantic colors to AI-generated text based on content patterns
 */
export function highlightAIText(text: string): string {
  if (!text) return text

  // STEP 1: Strip ALL HTML/CSS that AI might have generated
  // This uses DOMParser to safely remove any malformed HTML/inline styles
  let highlighted = stripAllHTML(text)

  // STEP 2: Convert markdown bold (**text**) to HTML strong tags
  highlighted = highlighted.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong>$1</strong>'
  )

  // STEP 3: Apply simple text formatting (NO INLINE COLORS)
  // Use only: bold, italic, underline, and background highlight

  // 3.1. Highlight percentages with bold
  highlighted = highlighted.replace(
    /([+-]?\d+\.?\d*)%/g,
    (match) => `<strong>${match}</strong>`
  )

  // 3.2. Highlight dollar amounts with bold
  highlighted = highlighted.replace(
    /\$[\d,]+\.?\d*/g,
    (match) => `<strong>${match}</strong>`
  )

  // 3.3. Highlight Zone IDs with bold
  highlighted = highlighted.replace(
    /\b(ZID)\s+(\d+)/gi,
    (match) => `<strong>${match}</strong>`
  )

  // 3.4. Highlight Publisher IDs with bold
  highlighted = highlighted.replace(
    /\b(PID)\s+(\d+)/gi,
    (match) => `<strong>${match}</strong>`
  )

  // 3.5. Highlight Media IDs with bold
  highlighted = highlighted.replace(
    /\b(MID)\s+(\d+)/gi,
    (match) => `<strong>${match}</strong>`
  )

  // 3.6. Highlight names in quotes with background
  highlighted = highlighted.replace(
    /"([^"]+)"/g,
    (match, name) => `<span style="background: #fef3c7; padding: 2px 4px; border-radius: 3px;">"${name}"</span>`
  )

  // 3.7. Highlight action verbs with underline + bold
  const actionVerbs = [
    'investigate', 'contact', 'review', 'optimize', 'monitor', 'schedule',
    'add', 'remove', 'test', 'expand', 'fix', 'check', 'analyze',
    'improve', 'increase', 'reduce', 'implement', 'deploy'
  ]

  const verbPattern = new RegExp(`\\b(${actionVerbs.join('|')})\\b`, 'gi')
  highlighted = highlighted.replace(verbPattern, (match) => `<u><strong>${match}</strong></u>`)

  // 3.8. Highlight urgency indicators with background
  const urgencyWords = [
    'today', 'urgent', 'critical', 'immediately', 'asap',
    'this week', 'high priority', 'requires attention'
  ]

  const urgencyPattern = new RegExp(`\\b(${urgencyWords.join('|')})\\b`, 'gi')
  highlighted = highlighted.replace(urgencyPattern, (match) => {
    return `<span style="background: #fee; padding: 2px 6px; border-radius: 3px;"><strong>${match.toUpperCase()}</strong></span>`
  })

  // 3.9. Highlight product names with italic + bold
  const productNames = [
    'Display', 'Video', 'Native', 'Overlay', 'Flexible Sticky',
    'Sticky', 'Banner', 'Interstitial', 'Rewarded'
  ]

  const productPattern = new RegExp(`\\b(${productNames.join('|')})\\b`, 'g')
  highlighted = highlighted.replace(productPattern, (match) => `<em><strong>${match}</strong></em>`)

  // 3.10. Highlight grades with background
  highlighted = highlighted.replace(
    /\b(Grade\s+)?([A-F][+-]?)\b/g,
    (match, prefix, grade) => {
      return `<span style="background: #e8f5e9; padding: 2px 6px; border-radius: 3px;"><strong>${prefix || ''}${grade}</strong></span>`
    }
  )

  // 11. Convert newlines to paragraphs (after all other highlighting)
  const lines = highlighted.split('\n').filter(line => line.trim())
  if (lines.length > 1) {
    highlighted = '<div class="space-y-2">' + lines.map(line => `<p>${line}</p>`).join('') + '</div>'
  }

  return highlighted
}

/**
 * Highlight specific entity types for drill-down interactions
 */
export function highlightEntity(
  text: string,
  entityType: 'zid' | 'pid' | 'mid' | 'product',
  onClick?: (id: string) => void
): string {
  // Implementation for clickable entity highlights (future enhancement)
  return text
}

/**
 * Strip all HTML tags from highlighted text (for export/copy)
 */
export function stripHighlights(highlightedText: string): string {
  return highlightedText.replace(/<[^>]*>/g, '')
}
