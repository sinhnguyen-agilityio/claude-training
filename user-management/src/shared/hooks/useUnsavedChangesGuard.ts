import { useCallback, useEffect, useRef } from 'react'
import { useBlocker } from 'react-router'

/**
 * Asks before leaving while `dirty` (SPEC F4): in-app navigation is held by a router blocker
 * (render a confirmation while `blocker.state === 'blocked'`), and reload or closing the tab
 * triggers the browser's own prompt. Call `allowNavigation()` right before navigating on purpose,
 * e.g. after a successful save. A navigation whose state has `discardChanges: true` is never held
 * (used when the user already confirmed losing everything, e.g. Reset demo data).
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const allowed = useRef(false)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      !allowed.current &&
      !discardsChanges(nextLocation.state) &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  )

  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (allowed.current) return
      event.preventDefault()
      // Older browsers need returnValue set to show the prompt.
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const allowNavigation = useCallback((allow = true) => {
    allowed.current = allow
  }, [])

  return { blocker, allowNavigation }
}

function discardsChanges(state: unknown) {
  return (
    typeof state === 'object' &&
    state !== null &&
    'discardChanges' in state &&
    state.discardChanges === true
  )
}
