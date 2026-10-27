import { z } from 'zod'
import type { UsersExport, UsersExportQuery, UsersPage, UsersQuery } from '@/features/users/query'
import { userSchema, type User, type UserCreate, type UserUpdate } from '@/features/users/schema'
import { seedUsers } from '@/mocks/seed'

export const STORAGE_KEY = 'user-management:users'

export class EmailTakenError extends Error {
  constructor() {
    super('Email is already in use')
    this.name = 'EmailTakenError'
  }
}

export interface UserRepository {
  /** Writes the seed data if storage is empty or unreadable. */
  ensureSeeded(): void
  list(query: UsersQuery): UsersPage
  /** Every user matching the filters, in sort order, without paging. */
  listAll(query: UsersExportQuery): UsersExport
  get(id: string): User | undefined
  /** @throws {EmailTakenError} */
  create(input: UserCreate): User
  /** Returns undefined when the user does not exist. @throws {EmailTakenError} */
  update(id: string, patch: UserUpdate): User | undefined
  /** Returns false when the user does not exist. */
  remove(id: string): boolean
  /** Restores the seed data. */
  reset(): void
}

interface RepositoryOptions {
  storage?: Storage
  now?: () => Date
  generateId?: () => string
}

const storedUsersSchema = z.array(userSchema)

/** A user store persisted in `localStorage` (SPEC §2). */
export function createUserRepository({
  storage = globalThis.localStorage,
  now = () => new Date(),
  generateId = () => crypto.randomUUID(),
}: RepositoryOptions = {}): UserRepository {
  function save(users: readonly User[]) {
    storage.setItem(STORAGE_KEY, JSON.stringify(users))
  }

  function load(): User[] {
    const parsed = storedUsersSchema.safeParse(parseJson(storage.getItem(STORAGE_KEY)))
    if (parsed.success) return parsed.data
    save(seedUsers)
    return structuredClone([...seedUsers])
  }

  function assertEmailFree(users: readonly User[], email: string, ownId?: string) {
    if (users.some((user) => user.email === email && user.id !== ownId)) {
      throw new EmailTakenError()
    }
  }

  function listAll(query: UsersExportQuery): UsersExport {
    const data = load()
      .filter((user) => matches(user, query))
      .sort(comparator(query))
    return { data, total: data.length }
  }

  return {
    ensureSeeded() {
      load()
    },

    listAll,

    list(query) {
      const matching = listAll(query).data
      const start = (query.page - 1) * query.pageSize
      return {
        data: matching.slice(start, start + query.pageSize),
        total: matching.length,
        page: query.page,
        pageSize: query.pageSize,
      }
    },

    get(id) {
      return load().find((user) => user.id === id)
    },

    create(input) {
      const users = load()
      assertEmailFree(users, input.email)
      const timestamp = now().toISOString()
      const user: User = { ...input, id: generateId(), createdAt: timestamp, updatedAt: timestamp }
      save([...users, user])
      return user
    },

    update(id, patch) {
      const users = load()
      const current = users.find((user) => user.id === id)
      if (!current) return undefined
      if (patch.email !== undefined) assertEmailFree(users, patch.email, id)
      const updated: User = { ...current, ...patch, updatedAt: now().toISOString() }
      save(users.map((user) => (user.id === id ? updated : user)))
      return updated
    },

    remove(id) {
      const users = load()
      const remaining = users.filter((user) => user.id !== id)
      if (remaining.length === users.length) return false
      save(remaining)
      return true
    },

    reset() {
      save(seedUsers)
    },
  }
}

function parseJson(raw: string | null): unknown {
  if (raw === null) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

/** Search matches first name, last name or email, each separately (SPEC §4). */
function matches(user: User, { q, role, status }: UsersExportQuery) {
  if (role && user.role !== role) return false
  if (status && user.status !== status) return false
  if (!q) return true
  const needle = q.toLowerCase()
  return [user.firstName, user.lastName, user.email].some((field) =>
    field.toLowerCase().includes(needle),
  )
}

const collator = new Intl.Collator('en', { sensitivity: 'base' })

/** Name sorts by last name, then first name. Ties fall back to email so the order is stable. */
function comparator({ sort, order }: UsersExportQuery) {
  const direction = order === 'asc' ? 1 : -1
  return (a: User, b: User) => {
    const primary =
      sort === 'name'
        ? collator.compare(a.lastName, b.lastName) || collator.compare(a.firstName, b.firstName)
        : a.createdAt.localeCompare(b.createdAt)
    return direction * (primary || a.email.localeCompare(b.email))
  }
}
