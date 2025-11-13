export interface StatusConfig {
  label: string
  bgColor: string
  textColor: string
  description: string
}

export function getStatusConfig(status: string | null): StatusConfig {
  const configs: Record<string, StatusConfig> = {
    closed_won: {
      label: 'Won',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      description: 'Deal closed successfully',
    },
    closed_lost: {
      label: 'Lost',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      description: 'Deal lost',
    },
    positive: {
      label: 'Positive',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      description: 'Positive response received',
    },
    negative: {
      label: 'Negative',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      description: 'Negative response received',
    },
    neutral: {
      label: 'Follow-up',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      description: 'Needs follow-up',
    },
    contacted: {
      label: 'Contacted',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      description: 'Contact made, awaiting response',
    },
  }

  return configs[status || 'contacted'] || configs.contacted
}

export const CONTACT_OUTCOMES = [
  { value: 'contacted', label: 'Initial Contact' },
  { value: 'retarget', label: 'Retarget' },
  { value: 'follow_up', label: 'Follow-up' },
]

export const RESPONSE_OUTCOMES = [
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
  { value: 'neutral', label: 'Neutral' },
]

export const CLOSED_STATUSES = [
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
]

export const ACTIVITY_TYPES = [
  { value: 'contact', label: 'Contact' },
  { value: 'response', label: 'Response' },
  { value: 'note', label: 'Note' },
]

export const ITEM_TYPES = [
  { value: 'domain_app_id', label: 'Domain / App ID' },
  { value: 'domain', label: 'Domain' },
  { value: 'pid', label: 'Publisher ID (PID)' },
  { value: 'mid', label: 'MID' },
  { value: 'publisher', label: 'Publisher' },
  { value: 'custom', label: 'Custom' },
]
