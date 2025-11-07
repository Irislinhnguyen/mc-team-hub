'use client'

import { useEffect, useState } from 'react'

export interface UserPreferences {
  team: 'APP_GV' | 'WEB_GV' | 'WEB_GTI' | 'All Teams'
  defaultMetric: 'revenue' | 'profit' | 'rpm' | 'impressions'
  recentSearches: string[]
  favoriteQuestions: string[]
  lastUpdated: number
}

const STORAGE_KEY = 'query_stream_user_preferences'

const DEFAULT_PREFERENCES: UserPreferences = {
  team: 'All Teams',
  defaultMetric: 'revenue',
  recentSearches: [],
  favoriteQuestions: [],
  lastUpdated: Date.now(),
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load preferences from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setPreferences(parsed)
      } catch (err) {
        console.error('Failed to parse preferences:', err)
        setPreferences(DEFAULT_PREFERENCES)
      }
    }
    setIsLoaded(true)
  }, [])

  const updateTeam = (team: UserPreferences['team']) => {
    const updated = { ...preferences, team, lastUpdated: Date.now() }
    setPreferences(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const updateDefaultMetric = (metric: UserPreferences['defaultMetric']) => {
    const updated = { ...preferences, defaultMetric: metric, lastUpdated: Date.now() }
    setPreferences(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const addRecentSearch = (query: string) => {
    const filtered = preferences.recentSearches.filter((s) => s !== query)
    const updated = {
      ...preferences,
      recentSearches: [query, ...filtered].slice(0, 10), // Keep last 10
      lastUpdated: Date.now(),
    }
    setPreferences(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const addFavoriteQuestion = (questionId: string) => {
    if (preferences.favoriteQuestions.includes(questionId)) {
      return // Already favorited
    }
    const updated = {
      ...preferences,
      favoriteQuestions: [...preferences.favoriteQuestions, questionId],
      lastUpdated: Date.now(),
    }
    setPreferences(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const removeFavoriteQuestion = (questionId: string) => {
    const updated = {
      ...preferences,
      favoriteQuestions: preferences.favoriteQuestions.filter((id) => id !== questionId),
      lastUpdated: Date.now(),
    }
    setPreferences(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const isFavorite = (questionId: string) => {
    return preferences.favoriteQuestions.includes(questionId)
  }

  const clearRecentSearches = () => {
    const updated = { ...preferences, recentSearches: [], lastUpdated: Date.now() }
    setPreferences(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  return {
    preferences,
    isLoaded,
    updateTeam,
    updateDefaultMetric,
    addRecentSearch,
    addFavoriteQuestion,
    removeFavoriteQuestion,
    isFavorite,
    clearRecentSearches,
  }
}
