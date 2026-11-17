import { useEffect, useRef } from 'react'

/**
 * Shared modal behavior: focus the marked control on open, close on Escape,
 * and restore focus to the trigger when the dialog unmounts.
 */
export function useDialogFocus<T extends HTMLElement>(onClose: () => void) {
  const dialogRef = useRef<T>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const target = dialog?.querySelector<HTMLElement>('[data-autofocus]')

    if (target) target.focus()
    else dialog?.focus()

    return () => {
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onCloseRef.current()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return dialogRef
}
