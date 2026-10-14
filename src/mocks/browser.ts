import { setupWorker } from 'msw/browser'
import { createHandlers } from '@/mocks/handlers'
import { createUserRepository } from '@/mocks/repository'

/**
 * Starts the in-browser mock API. It runs in every build, production included,
 * because there is no real backend (SPEC §2).
 */
export async function startMocks() {
  const repository = createUserRepository()
  repository.ensureSeeded()

  const worker = setupWorker(...createHandlers(repository))
  await worker.start({
    onUnhandledFrame: 'bypass',
    quiet: import.meta.env.PROD,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
}
