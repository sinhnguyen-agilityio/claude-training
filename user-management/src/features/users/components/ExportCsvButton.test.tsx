import { screen, waitFor } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/node'
import { renderRoute } from '@/test/renderWithProviders'

/** jsdom has no `URL.createObjectURL` and cannot download, so capture what would be saved. */
const downloads: { filename: string; blob: Blob }[] = []

beforeEach(() => {
  downloads.length = 0
  let lastBlob: Blob | undefined
  URL.createObjectURL = (blob: Blob) => {
    lastBlob = blob
    return 'blob:test'
  }
  URL.revokeObjectURL = () => {}
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    if (lastBlob) downloads.push({ filename: this.download, blob: lastBlob })
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(URL, 'createObjectURL')
  Reflect.deleteProperty(URL, 'revokeObjectURL')
})

function readBlob(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob, 'utf-8')
  })
}

const ONE_USER = {
  id: '7b0f6d2e-0000-4000-8000-000000000001',
  firstName: 'Anna',
  lastName: 'Lee',
  email: 'anna@example.com',
  phone: null,
  role: 'admin',
  status: 'active',
  createdAt: '2026-01-02T03:04:05.000Z',
  updatedAt: '2026-02-03T04:05:06.000Z',
}

const exportButton = () => screen.getByRole('button', { name: /^Export CSV|^Exporting/ })

async function renderLoaded(path = '/users') {
  const rendered = renderRoute(path)
  await screen.findByRole('table', { name: 'Users' })
  await waitFor(() => expect(exportButton()).not.toHaveAttribute('aria-disabled'))
  return rendered
}

describe('Export CSV button', () => {
  it('is in the toolbar, outside the search landmark', async () => {
    await renderLoaded()
    expect(exportButton()).toBeInTheDocument()
    expect(screen.getByRole('search')).not.toContainElement(exportButton())
  })

  it('downloads all users, not only the visible page', async () => {
    const { user } = await renderLoaded()
    await user.click(exportButton())

    await waitFor(() => expect(downloads).toHaveLength(1))
    const text = await readBlob(downloads[0]!.blob)
    // BOM + header + 25 users + trailing newline.
    expect(text.split('\r\n')).toHaveLength(27)
    expect(downloads[0]!.filename).toMatch(/^users-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it('exports the current search, filter and sort in order', async () => {
    const { user } = await renderLoaded('/users?q=an&role=editor&sort=name&order=asc')
    await user.click(exportButton())

    await waitFor(() => expect(downloads).toHaveLength(1))
    const lines = (await readBlob(downloads[0]!.blob)).split('\r\n')
    expect(lines).toHaveLength(4)
    expect(lines[1]).toMatch(/^Joanne,Baker,/)
    expect(lines[2]).toMatch(/^Fatima,Khan,/)
  })

  it('sends no paging and shows no success toast', async () => {
    let requested: URL | undefined
    server.use(
      http.get('/api/users/export', ({ request }) => {
        requested = new URL(request.url)
        return HttpResponse.json({ data: [ONE_USER], total: 1 })
      }),
    )
    const { user } = await renderLoaded('/users?role=viewer&page=2')
    await user.click(exportButton())

    await waitFor(() => expect(downloads).toHaveLength(1))
    expect(requested?.searchParams.get('role')).toBe('viewer')
    expect(requested?.searchParams.has('page')).toBe(false)
    expect(requested?.searchParams.has('pageSize')).toBe(false)
    expect(screen.getByRole('status', { name: 'Notifications' })).toBeEmptyDOMElement()
  })

  it('is aria-disabled while the list is loading', () => {
    renderRoute('/users')
    expect(exportButton()).toHaveAttribute('aria-disabled', 'true')
  })

  it('is aria-disabled but still focusable with no results, and explains why', async () => {
    let requests = 0
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/api/users/export')) requests += 1
    })
    const { user } = renderRoute('/users?q=nobody-matches-this')
    await screen.findByText('No users match your filters')

    const button = exportButton()
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toBeDisabled()

    await user.click(button)
    expect(requests).toBe(0)
    expect(downloads).toHaveLength(0)

    await user.hover(button)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('No users to export')
    expect(button).toHaveAccessibleDescription('No users to export')
    server.events.removeAllListeners()
  })

  it('shows the tooltip on keyboard focus and Escape hides it', async () => {
    const { user } = renderRoute('/users?q=nobody-matches-this')
    await screen.findByText('No users match your filters')

    while (document.activeElement !== exportButton()) await user.tab()
    expect(screen.getByRole('tooltip')).toHaveTextContent('No users to export')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(exportButton()).toHaveFocus()
  })

  it('is aria-disabled when the list failed to load', async () => {
    server.use(
      http.get('/api/users', () => HttpResponse.json({ message: 'Boom' }, { status: 500 })),
    )
    renderRoute('/users')
    await screen.findByText('Could not load users')
    expect(exportButton()).toHaveAttribute('aria-disabled', 'true')
  })

  it('is aria-busy and ignores clicks while the file is generated', async () => {
    let requests = 0
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.get('/api/users/export', async () => {
        requests += 1
        await gate
        return HttpResponse.json({ data: [ONE_USER], total: 1 })
      }),
    )
    const { user } = await renderLoaded()
    await user.click(exportButton())
    await waitFor(() => expect(exportButton()).toHaveAttribute('aria-busy', 'true'))

    await user.click(exportButton())
    release()

    await waitFor(() => expect(downloads).toHaveLength(1))
    expect(requests).toBe(1)
    await waitFor(() => expect(exportButton()).not.toHaveAttribute('aria-busy'))
  })

  it('still toasts "Export failed" when the list page is left before the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.get('/api/users/export', async () => {
        await gate
        return HttpResponse.json({ message: 'Nope' }, { status: 500 })
      }),
    )
    const { user } = await renderLoaded()
    await user.click(exportButton())
    await waitFor(() => expect(exportButton()).toHaveAttribute('aria-busy', 'true'))

    await user.click(screen.getByRole('link', { name: 'Add user' }))
    await screen.findByRole('heading', { name: 'Add user' })
    release()

    expect(await screen.findByText('Export failed')).toBeInTheDocument()
    expect(downloads).toHaveLength(0)
  })

  it('downloads nothing and says so when the list emptied after it was fetched', async () => {
    server.use(http.get('/api/users/export', () => HttpResponse.json({ data: [], total: 0 })))
    const { user } = await renderLoaded()
    await user.click(exportButton())

    expect(await screen.findByText('No users to export')).toBeInTheDocument()
    expect(downloads).toHaveLength(0)
    await waitFor(() => expect(exportButton()).not.toHaveAttribute('aria-busy'))
  })

  it('logs the cause when the file cannot be generated, and still toasts "Export failed"', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    URL.createObjectURL = () => {
      throw new Error('blocked by the browser')
    }
    const { user } = await renderLoaded()
    await user.click(exportButton())

    expect(await screen.findByText('Export failed')).toBeInTheDocument()
    expect(logged).toHaveBeenCalledWith('Export failed', expect.any(Error))
    expect(downloads).toHaveLength(0)
  })

  it('shows the tooltip when the disabled button is tapped', async () => {
    const { user } = renderRoute('/users?q=nobody-matches-this')
    await screen.findByText('No users match your filters')

    await user.click(exportButton())
    expect(screen.getByRole('tooltip')).toHaveTextContent('No users to export')

    await user.click(document.body)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('toasts "Export failed" and downloads nothing when the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(
      http.get('/api/users/export', async () => {
        await delay(0)
        return HttpResponse.json({ message: 'Nope' }, { status: 500 })
      }),
    )
    const { user } = await renderLoaded()
    await user.click(exportButton())

    expect(await screen.findByText('Export failed')).toBeInTheDocument()
    expect(downloads).toHaveLength(0)
    await waitFor(() => expect(exportButton()).not.toHaveAttribute('aria-busy'))
  })
})
