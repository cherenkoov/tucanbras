'use client'

import { useEffect } from 'react'

const MAX_RETRIES = 3
const STORAGE_KEY = 'notion_retry'

export default function NotionRetry() {
  useEffect(() => {
    const count = parseInt(sessionStorage.getItem(STORAGE_KEY) ?? '0', 10)
    if (count < MAX_RETRIES) {
      sessionStorage.setItem(STORAGE_KEY, String(count + 1))
      window.location.reload()
    }
  }, [])

  return null
}
