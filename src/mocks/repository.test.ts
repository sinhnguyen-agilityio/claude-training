import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usersQuerySchema, type UsersQueryInput } from '@/features/users/query'
import { userSchema, type UserCreate } from '@/features/users/schema'
import {
  createUserRepository,
  EmailTakenError,
  STORAGE_KEY,
  type UserRepository,
} from '@/mocks/repository'
import { seedUsers } from '@/mocks/seed'

const NOW = new Date('2026-10-14T12:00:00.000Z')
const NEW_ID = '11111111-1111-4111-8111-111111111111'

const newUser: UserCreate = {
  firstName: 'Zoe',
  lastName: 'Adams',
  email: 'zoe.adams@example.com',
  phone: null,
  role: 'viewer',
  status: 'active',
}

let repository: UserRepository

beforeEach(() => {
  repository = createUserRepository({ now: () => NOW, generateId: () => NEW_ID })
})

function list(query: UsersQueryInput = {}) {
  return repository.list(usersQuerySchema.parse(query))
}

function names(query: UsersQueryInput) {
  return list(query).data.map((user) => `${user.firstName} ${user.lastName}`)
}

describe('seed data', () => {
  it('has 25 valid users with unique ids and emails', () => {
    expect(seedUsers).toHaveLength(25)
    for (const user of seedUsers) expect(userSchema.parse(user)).toEqual(user)
    expect(new Set(seedUsers.map((user) => user.id)).size).toBe(25)
    expect(new Set(seedUsers.map((user) => user.email)).size).toBe(25)
  })
})

describe('storage', () => {
  it('seeds empty storage', () => {
    repository.ensureSeeded()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(25)
  })

  it.each([
    ['invalid JSON', '{not json'],
    ['not a list of users', '[{"id":1}]'],
  ])('reseeds when storage holds %s', (_case, raw) => {
    localStorage.setItem(STORAGE_KEY, raw)
    expect(list().total).toBe(25)
  })

  it('persists changes across repository instances', () => {
    repository.create(newUser)
    expect(createUserRepository().get(NEW_ID)).toMatchObject(newUser)
  })
})

describe('list', () => {
  it('returns the first 10 users, newest first, by default', () => {
    const page = list()
    expect(page).toMatchObject({ total: 25, page: 1, pageSize: 10 })
    expect(page.data).toHaveLength(10)
    expect(page.data[0]?.firstName).toBe('Ben') // created 2026-01-25
    expect(page.data[9]?.firstName).toBe('Aisha') // created 2026-01-16
  })

  it('paginates, with a short last page', () => {
    expect(list({ page: 3 }).data).toHaveLength(5)
    expect(list({ pageSize: 50 }).data).toHaveLength(25)
  })

  it('returns no data but the real total for a page past the end', () => {
    expect(list({ page: 4 })).toMatchObject({ data: [], total: 25, page: 4 })
  })

  it('searches first name, last name and email, case-insensitively', () => {
    expect(names({ q: 'ANN', sort: 'name', order: 'asc' })).toEqual([
      'Joanne Baker',
      'Anna Kowalski',
      'Hannah Lee',
    ])
    expect(names({ q: 'nguyen' })).toEqual(['Lan Nguyen', 'Minh Nguyen'])
    expect(names({ q: 'obrien@' })).toEqual(["Liam O'Brien"])
  })

  it('does not match across first and last name', () => {
    expect(list({ q: 'minh n' }).total).toBe(0)
  })

  it('filters by role and status', () => {
    expect(names({ role: 'admin', status: 'inactive' })).toEqual(['Kenji Tanaka'])
    expect(list({ role: 'admin' }).total).toBe(5)
    expect(list({ status: 'inactive' }).total).toBe(6)
  })

  it('sorts by last name, then first name', () => {
    expect(names({ sort: 'name', order: 'asc', pageSize: 3 })).toEqual([
      'Oscar Andersson',
      'Joanne Baker',
      'Aisha Bello',
    ])
    expect(names({ q: 'nguyen', sort: 'name', order: 'asc' })).toEqual([
      'Lan Nguyen',
      'Minh Nguyen',
    ])
    expect(names({ sort: 'name', order: 'desc', pageSize: 1 })).toEqual(['Ben Wright'])
  })

  it('sorts by created date ascending', () => {
    expect(names({ order: 'asc', pageSize: 2 })).toEqual(['Anna Kowalski', 'Minh Nguyen'])
  })
})

describe('get', () => {
  it('finds a user by id, or returns undefined', () => {
    expect(repository.get(seedUsers[0]!.id)?.email).toBe('anna.kowalski@example.com')
    expect(repository.get('missing')).toBeUndefined()
  })
})

describe('create', () => {
  it('assigns id and timestamps, and stores the user', () => {
    const created = repository.create(newUser)
    expect(created).toEqual({
      ...newUser,
      id: NEW_ID,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    })
    expect(list().total).toBe(26)
    expect(list().data[0]?.id).toBe(NEW_ID)
  })

  it('rejects an email that is already taken', () => {
    expect(() => repository.create({ ...newUser, email: 'anna.kowalski@example.com' })).toThrow(
      EmailTakenError,
    )
    expect(list().total).toBe(25)
  })
})

describe('update', () => {
  const id = seedUsers[0]!.id

  it('merges the patch and bumps updatedAt only', () => {
    const updated = repository.update(id, { firstName: 'Ania', phone: null })
    expect(updated).toMatchObject({
      firstName: 'Ania',
      lastName: 'Kowalski',
      phone: null,
      createdAt: seedUsers[0]!.createdAt,
      updatedAt: NOW.toISOString(),
    })
    expect(repository.get(id)).toEqual(updated)
  })

  it('lets a user keep their own email', () => {
    expect(repository.update(id, { email: 'anna.kowalski@example.com' })).toBeDefined()
  })

  it("rejects another user's email", () => {
    expect(() => repository.update(id, { email: 'minh.nguyen@example.com' })).toThrow(
      EmailTakenError,
    )
  })

  it('returns undefined for an unknown id', () => {
    expect(repository.update('missing', { firstName: 'X' })).toBeUndefined()
  })
})

describe('remove', () => {
  it('deletes a user, and reports unknown ids', () => {
    expect(repository.remove(seedUsers[0]!.id)).toBe(true)
    expect(list().total).toBe(24)
    expect(repository.remove(seedUsers[0]!.id)).toBe(false)
  })
})

describe('removeMany and updateMany', () => {
  const [first, second] = [seedUsers[0]!, seedUsers[1]!]

  it('removes the listed users with a single save and skips unknown ids', () => {
    repository.ensureSeeded()
    const save = vi.spyOn(Storage.prototype, 'setItem')

    expect(repository.removeMany([first.id, 'missing', second.id])).toEqual([first.id, second.id])

    expect(save).toHaveBeenCalledTimes(1)
    expect(list().total).toBe(23)
    save.mockRestore()
  })

  it('updates the status and updatedAt of every listed user with a single save', () => {
    repository.ensureSeeded()
    const save = vi.spyOn(Storage.prototype, 'setItem')

    // `first` is already active: it still gets a new updatedAt.
    expect(repository.updateMany([first.id, 'missing', second.id], { status: 'active' })).toEqual([
      first.id,
      second.id,
    ])

    expect(save).toHaveBeenCalledTimes(1)
    for (const id of [first.id, second.id]) {
      expect(repository.get(id)).toMatchObject({ status: 'active', updatedAt: NOW.toISOString() })
    }
    expect(repository.get(seedUsers[2]!.id)).toEqual(seedUsers[2])
    save.mockRestore()
  })

  it('does not write when no listed id exists', () => {
    repository.ensureSeeded()
    const save = vi.spyOn(Storage.prototype, 'setItem')

    expect(repository.removeMany(['missing'])).toEqual([])
    expect(repository.updateMany(['missing'], { status: 'inactive' })).toEqual([])

    expect(save).not.toHaveBeenCalled()
    save.mockRestore()
  })
})

describe('reset', () => {
  it('restores the seed data', () => {
    repository.create(newUser)
    repository.remove(seedUsers[0]!.id)
    repository.reset()
    expect(list({ pageSize: 50 }).data).toEqual([...seedUsers].reverse())
  })
})
