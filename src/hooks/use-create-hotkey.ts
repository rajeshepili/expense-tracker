import { useEffect, useRef } from 'react'
import { motion } from '#/lib/motion'

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

export function useCreateHotkey(onCreate: () => void, blocked = false) {
  const onCreateRef = useRef(onCreate)
  onCreateRef.current = onCreate

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (blocked || isTypingTarget(event.target)) return
      if (!motion.can('hotkey')) return
      if (event.key !== 'n' && event.key !== 'N') return
      event.preventDefault()
      onCreateRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [blocked])
}
