import { act, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { userKeys } from '@/features/users/api/hooks'
import { server } from '@/mocks/node'
import { seedUsers } from '@/mocks/seed'
import { renderRoute } from '@/test/renderWithProviders'

// Newest first: the first page is Ben Wright (seedUsers[24]) followed by seedUsers[23].
const ben = seedUsers[24]!
const next = seedUsers[23]!
const nextName = `${next.firstName} ${next.lastName}`

function rowNames() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getByRole('rowheader').textContent)
}

const notifications = () => screen.getByRole('status', { name: 'Notifications' })
const headerBox = () =>
  screen.getByRole<HTMLInputElement>('checkbox', { name: 'Select all users on this page' })
const rowBox = (name: string) => screen.getByRole('checkbox', { name: `Select ${name}` })
const heading = () => screen.getByRole('heading', { name: 'Users', level: 1 })

async function renderList(path = '/users') {
  const rendered = renderRoute(path)
  await screen.findByRole('table', { name: 'Users' })
  return rendered
}

type User = Awaited<ReturnType<typeof renderList>>['user']

async function select(user: User, ...names: string[]) {
  for (const name of names) await user.click(rowBox(name))
}

async function confirmDelete(user: User) {
  await user.click(screen.getByRole('button', { name: 'Delete' }))
  await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))
}

const failAll = http.post('/api/users/bulk', async ({ request }) => {
  const { ids } = (await request.json()) as { ids: string[] }
  return HttpResponse.json({ succeeded: [], failed: ids.map((id) => ({ id, reason: 'x' })) })
})

describe('Bulk selection', () => {
  it('labels a checkbox per row and the select-all box in the header', async () => {
    await renderList()
    expect(screen.getAllByRole('checkbox')).toHaveLength(11)
    expect(rowBox('Ben Wright')).not.toBeChecked()
    expect(headerBox()).not.toBeChecked()
    expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument()
  })

  it('shows the action bar with a singular and a plural count', async () => {
    const { user } = await renderList()

    await select(user, 'Ben Wright')
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    for (const name of ['Set active', 'Set inactive', 'Delete', 'Clear selection']) {
      expect(screen.getByRole('button', { name })).toBeEnabled()
    }

    await select(user, nextName)
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  it('makes the header box indeterminate for a partial selection and checked for all', async () => {
    const { user } = await renderList()

    await select(user, 'Ben Wright')
    expect(headerBox().indeterminate).toBe(true)
    expect(headerBox()).not.toBeChecked()

    await user.click(headerBox())
    expect(headerBox()).toBeChecked()
    expect(headerBox().indeterminate).toBe(false)
    expect(screen.getByText('10 selected')).toBeInTheDocument()

    await user.click(headerBox())
    expect(screen.queryByText('10 selected')).not.toBeInTheDocument()
  })

  it('Clear selection unselects every row and hides the bar', async () => {
    const { user } = await renderList()
    await select(user, 'Ben Wright')

    await user.click(screen.getByRole('button', { name: 'Clear selection' }))

    expect(rowBox('Ben Wright')).not.toBeChecked()
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument()
  })

  it('clears the selection when the page changes', async () => {
    const { user } = await renderList()
    await select(user, 'Ben Wright')

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByText('Showing 11–20 of 25')).toBeInTheDocument())
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous' }))
    await waitFor(() => expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument())
    expect(rowBox('Ben Wright')).not.toBeChecked()
  })

  it('clears the selection when a filter changes', async () => {
    const { user } = await renderList()
    await select(user, 'Ben Wright')

    await user.selectOptions(screen.getByLabelText('Status'), 'inactive')

    await waitFor(() => expect(screen.queryByText('1 selected')).not.toBeInTheDocument())
  })

  it('clears the selection when the debounced search changes', async () => {
    const { user } = await renderList()
    await select(user, 'Ben Wright')

    await user.type(screen.getByRole('searchbox'), 'wright')

    await waitFor(() => expect(screen.queryByText('1 selected')).not.toBeInTheDocument())
  })
})

describe('Bulk delete', () => {
  it('asks for confirmation, and Cancel keeps the selection and sends no request', async () => {
    let requests = 0
    server.use(
      http.post('/api/users/bulk', () => {
        requests++
        return HttpResponse.json({ succeeded: [], failed: [] })
      }),
    )
    const { user } = await renderList()
    await select(user, 'Ben Wright', nextName)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Delete 2 users?' })
    expect(dialog).toHaveAccessibleDescription(
      'This permanently deletes 2 users and cannot be undone.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    expect(requests).toBe(0)
  })

  it('uses singular wording for one user, removes it, then focuses the heading', async () => {
    const { user } = await renderList()
    await select(user, 'Ben Wright')

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Delete 1 user?' })
    expect(dialog).toHaveAccessibleDescription(
      'This permanently deletes 1 user and cannot be undone.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.getByText('Showing 1–10 of 24')).toBeInTheDocument())
    expect(notifications()).toHaveTextContent('1 user deleted')
    expect(rowNames()).not.toContain('Ben Wright')
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument()
    await waitFor(() => expect(heading()).toHaveFocus())
  })

  it('goes back one page when the current page is emptied', async () => {
    // Delete the 4 oldest users, leaving 21: page 3 then holds only Joanne Baker.
    for (const oldest of seedUsers.slice(0, 4)) {
      await fetch(new URL(`/api/users/${oldest.id}`, location.origin), { method: 'DELETE' })
    }
    const { user, router } = renderRoute('/users?page=3')
    await waitFor(() => expect(screen.getByText('Showing 21–21 of 21')).toBeInTheDocument())

    await select(user, 'Joanne Baker')
    await confirmDelete(user)

    await waitFor(() => expect(screen.getByText('Showing 11–20 of 20')).toBeInTheDocument())
    expect(router.state.location.search).toBe('?page=2')
    expect(notifications()).toHaveTextContent('1 user deleted')
  })

  it('removes the detail cache of deleted users once the lists have refreshed', async () => {
    const { user, queryClient } = await renderList()
    queryClient.setQueryData(userKeys.detail(ben.id), ben)
    await select(user, 'Ben Wright')

    await confirmDelete(user)

    await waitFor(() => expect(screen.getByText('Showing 1–10 of 24')).toBeInTheDocument())
    expect(queryClient.getQueryData(userKeys.detail(ben.id))).toBeUndefined()
  })
})

describe('Bulk status change', () => {
  it('changes status without confirming, including users who already have it', async () => {
    const { user, queryClient } = await renderList()
    queryClient.setQueryData(userKeys.detail(ben.id), ben)
    await select(user, 'Ben Wright', nextName)

    await user.click(screen.getByRole('button', { name: 'Set active' }))

    await waitFor(() => expect(notifications()).toHaveTextContent('2 users updated'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByText('2 selected')).not.toBeInTheDocument()
    const benRow = screen.getByRole('rowheader', { name: 'Ben Wright' }).closest('tr')!
    expect(within(benRow).getByText('Active')).toBeInTheDocument()
    expect(queryClient.getQueryState(userKeys.detail(ben.id))?.isInvalidated).toBe(true)
  })

  it('uses singular wording for one user', async () => {
    const { user } = await renderList()
    await select(user, 'Ben Wright')

    await user.click(screen.getByRole('button', { name: 'Set inactive' }))

    await waitFor(() => expect(notifications()).toHaveTextContent('1 user updated'))
  })

  it('refreshes a status-filtered list when the change removes users from the view', async () => {
    const { user } = await renderList('/users?status=inactive')
    await waitFor(() => expect(rowNames()).toContain('Ben Wright'))

    await select(user, 'Ben Wright')
    await user.click(screen.getByRole('button', { name: 'Set active' }))

    await waitFor(() => expect(rowNames()).not.toContain('Ben Wright'))
    expect(notifications()).toHaveTextContent('1 user updated')
  })

  it('goes back one page when a status change empties the current page', async () => {
    // 8 inactive users plus 2 active ones fit one page, so use the last page of a 2-page filter.
    const { user, router } = await renderList('/users?status=active&page=2')
    await waitFor(() => expect(screen.getByText(/^Showing 11–/)).toBeInTheDocument())

    await user.click(headerBox())
    await user.click(screen.getByRole('button', { name: 'Set inactive' }))

    await waitFor(() => expect(router.state.location.search).toBe('?status=active'))
  })
})

describe('Bulk failures', () => {
  it('warns about a partial failure and keeps the failed rows that are still listed', async () => {
    server.use(
      http.post('/api/users/bulk', async ({ request }) => {
        const { ids } = (await request.json()) as { ids: string[] }
        // Really delete the first id so the list refreshes without it; report the second as failed.
        await fetch(new URL(`/api/users/${ids[0]}`, location.origin), { method: 'DELETE' })
        return HttpResponse.json({
          succeeded: [ids[0]],
          failed: [{ id: ids[1], reason: 'locked' }],
        })
      }),
    )
    const { user } = await renderList()
    await select(user, 'Ben Wright', nextName)

    await confirmDelete(user)

    await waitFor(() => expect(notifications()).toHaveTextContent('1 of 2 deleted, 1 failed'))
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(rowBox(nextName)).toBeChecked()
  })

  it('drops failed rows that are no longer in the refreshed list', async () => {
    server.use(
      http.post('/api/users/bulk', async ({ request }) => {
        const { ids } = (await request.json()) as { ids: string[] }
        // Both users vanish, but the API reports one as failed (e.g. deleted by someone else).
        for (const id of ids) {
          await fetch(new URL(`/api/users/${id}`, location.origin), { method: 'DELETE' })
        }
        return HttpResponse.json({
          succeeded: [ids[0]],
          failed: [{ id: ids[1], reason: 'not_found' }],
        })
      }),
    )
    const { user } = await renderList()
    await select(user, 'Ben Wright', nextName)

    await confirmDelete(user)

    await waitFor(() => expect(notifications()).toHaveTextContent('1 of 2 deleted, 1 failed'))
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument()
    await waitFor(() => expect(heading()).toHaveFocus())
  })

  it('shows an error toast and keeps the selection when every id fails', async () => {
    server.use(failAll)
    const { user } = await renderList()
    await select(user, 'Ben Wright')

    await user.click(screen.getByRole('button', { name: 'Set active' }))

    await waitFor(() => expect(notifications()).toHaveTextContent('Could not update 1 user'))
    expect(notifications()).not.toHaveTextContent('updated')
    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })

  it('refreshes the list after a lost response, so users deleted meanwhile leave the selection', async () => {
    server.use(http.post('/api/users/bulk', () => HttpResponse.error()))
    const { user } = await renderList()
    await select(user, 'Ben Wright', 'Grace Taylor')
    await fetch(new URL(`/api/users/${ben.id}`, location.origin), { method: 'DELETE' })

    await user.click(screen.getByRole('button', { name: 'Set active' }))

    await waitFor(() => expect(notifications()).toHaveTextContent('Could not update 2 users'))
    await waitFor(() => expect(screen.getByText('1 selected')).toBeInTheDocument())
    expect(screen.queryByRole('checkbox', { name: 'Select Ben Wright' })).not.toBeInTheDocument()
  })

  it('clears the selection and focuses the heading when every id is already gone', async () => {
    const { user } = await renderList()
    await select(user, 'Ben Wright', 'Grace Taylor')
    for (const { id } of [ben, seedUsers[23]!]) {
      await fetch(new URL(`/api/users/${id}`, location.origin), { method: 'DELETE' })
    }

    await user.click(screen.getByRole('button', { name: 'Set active' }))

    await waitFor(() => expect(notifications()).toHaveTextContent('Could not update 2 users'))
    await waitFor(() => expect(screen.queryByText('2 selected')).not.toBeInTheDocument())
    await waitFor(() => expect(heading()).toHaveFocus())
  })

  it.each([
    ['a server error', () => HttpResponse.json({ message: 'Boom' }, { status: 500 })],
    ['a network failure', () => HttpResponse.error()],
  ])('shows an error toast and keeps the selection after %s', async (_name, response) => {
    server.use(http.post('/api/users/bulk', response))
    const { user } = await renderList()
    await select(user, 'Ben Wright', nextName)

    await confirmDelete(user)

    await waitFor(() => expect(notifications()).toHaveTextContent('Could not delete 2 users'))
    expect(notifications()).not.toHaveTextContent('deleted,')
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })
})

describe('Bulk action in flight', () => {
  it('disables the actions and checkboxes while the request runs, then re-enables them', async () => {
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.post('/api/users/bulk', async (info) => {
        await gate
        return failAll.run(info).then((result) => result?.response ?? HttpResponse.error())
      }),
    )
    const { user } = await renderList()
    await select(user, 'Ben Wright')

    await user.click(screen.getByRole('button', { name: 'Set active' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Set active' })).toBeDisabled())
    for (const name of ['Set inactive', 'Delete', 'Clear selection']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }
    expect(headerBox()).toBeDisabled()
    expect(rowBox('Ben Wright')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()

    await act(async () => release())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Set active' })).toBeEnabled())
    expect(rowBox('Ben Wright')).toBeEnabled()
  })

  it('finishes against the original ids when the view changes, and stays unselected', async () => {
    const seen: string[][] = []
    server.use(
      http.post('/api/users/bulk', async ({ request }) => {
        const { ids } = (await request.json()) as { ids: string[] }
        seen.push(ids)
        await delay(150)
        return HttpResponse.json({ succeeded: [], failed: ids.map((id) => ({ id, reason: 'x' })) })
      }),
    )
    const { user } = await renderList()
    await select(user, 'Ben Wright')

    await user.click(screen.getByRole('button', { name: 'Set active' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => expect(notifications()).toHaveTextContent('Could not update 1 user'))
    expect(seen).toEqual([[ben.id]])
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 11–20 of 25')).toBeInTheDocument()
    expect(heading()).not.toHaveFocus()
    await waitFor(() => expect(headerBox()).toBeEnabled())
  })
})

describe('Bulk selection stays consistent with the list', () => {
  it('closes an open delete dialog when the view changes, and sends no request', async () => {
    let requests = 0
    server.use(
      http.post('/api/users/bulk', () => {
        requests++
        return HttpResponse.json({ succeeded: [], failed: [] })
      }),
    )
    const { user, router } = await renderList()
    await select(user, 'Ben Wright')
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('alertdialog', { name: 'Delete 1 user?' })).toBeInTheDocument()

    await act(() => router.navigate('/users?status=inactive'))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(requests).toBe(0)
  })

  it('closes an open delete dialog when the selected users leave the page', async () => {
    const { user, queryClient } = await renderList()
    await select(user, 'Ben Wright')
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('alertdialog', { name: 'Delete 1 user?' })).toBeInTheDocument()

    await fetch(new URL(`/api/users/${ben.id}`, location.origin), { method: 'DELETE' })
    await act(() => queryClient.invalidateQueries({ queryKey: userKeys.lists() }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await user.click(rowBox(nextName))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('drops selected users that left the page for other reasons', async () => {
    const { user, queryClient } = await renderList()
    await select(user, 'Ben Wright', 'Grace Taylor')
    expect(screen.getByText('2 selected')).toBeInTheDocument()

    await fetch(new URL(`/api/users/${seedUsers[23]!.id}`, location.origin), { method: 'DELETE' })
    await act(() => queryClient.invalidateQueries({ queryKey: userKeys.lists() }))

    await waitFor(() => expect(screen.getByText('1 selected')).toBeInTheDocument())
    expect(rowBox('Ben Wright')).toBeChecked()
  })

  it('keeps the checkboxes usable during a background refetch', async () => {
    const { user, queryClient } = await renderList()
    await select(user, 'Ben Wright')
    // Resolving with nothing falls through to the default handler, after a delay.
    server.use(
      http.get('/api/users', async () => {
        await delay(200)
      }),
    )

    const refetch = queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    await waitFor(() => expect(queryClient.isFetching({ queryKey: userKeys.lists() })).toBe(1))

    expect(headerBox()).toBeEnabled()
    expect(rowBox('Ben Wright')).toBeEnabled()
    await act(async () => {
      await refetch
    })
  })
})

describe('Bulk actions accessibility', () => {
  it('keeps one live region mounted, so the first selection is announced', async () => {
    const { user } = await renderList()
    const live = () =>
      screen.getAllByRole('status', { hidden: true }).find((el) => !el.hasAttribute('aria-label'))!
    const before = live()
    expect(before).toBeEmptyDOMElement()

    await select(user, 'Ben Wright')

    expect(live()).toBe(before)
    expect(before).toHaveTextContent('1 selected')
  })

  it('announces the count in a polite live region', async () => {
    const { user } = await renderList()
    await select(user, 'Ben Wright')
    expect(screen.getByText('1 selected')).toHaveAttribute('role', 'status')
  })

  it('gives the page heading tabindex -1 so it can receive focus', async () => {
    await renderList()
    expect(heading()).toHaveAttribute('tabindex', '-1')
  })
})
