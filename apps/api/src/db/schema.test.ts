import { getTableConfig } from 'drizzle-orm/pg-core'
import { USER_ROLES, USER_STATUSES } from '@app/shared'
import { describe, expect, it } from 'vitest'
import { users } from './schema'

const { columns, indexes, name } = getTableConfig(users)

function column(columnName: string) {
  const found = columns.find((candidate) => candidate.name === columnName)
  if (!found) throw new Error(`No column ${columnName}`)
  return found
}

describe('users table', () => {
  it('is called users and has exactly the columns of SPEC §3', () => {
    expect(name).toBe('users')
    expect(columns.map((c) => c.name)).toEqual([
      'id',
      'first_name',
      'last_name',
      'email',
      'phone',
      'role',
      'status',
      'created_at',
      'updated_at',
    ])
  })

  it('has a uuid primary key that the database generates', () => {
    const id = column('id')
    expect(id.getSQLType()).toBe('uuid')
    expect(id.primary).toBe(true)
    expect(id.hasDefault).toBe(true)
  })

  it.each(['first_name', 'last_name'])('has %s as a required varchar(50)', (columnName) => {
    const found = column(columnName)
    expect(found.getSQLType()).toBe('varchar(50)')
    expect(found.notNull).toBe(true)
  })

  it('has a required email', () => {
    const email = column('email')
    expect(email.getSQLType()).toBe('varchar')
    expect(email.notNull).toBe(true)
  })

  it('has an optional phone of at most 20 characters', () => {
    const phone = column('phone')
    expect(phone.getSQLType()).toBe('varchar(20)')
    expect(phone.notNull).toBe(false)
  })

  it('has role and status as enums with the values of the shared schema', () => {
    const role = column('role')
    expect(role.getSQLType()).toBe('user_role')
    expect(role.notNull).toBe(true)
    expect(role.enumValues).toEqual([...USER_ROLES])

    const status = column('status')
    expect(status.getSQLType()).toBe('user_status')
    expect(status.notNull).toBe(true)
    expect(status.enumValues).toEqual([...USER_STATUSES])
  })

  it('defaults the status to active', () => {
    expect(column('status').default).toBe('active')
  })

  it.each(['created_at', 'updated_at'])('has %s as a required timestamptz set by now()', (name) => {
    const found = column(name)
    expect(found.getSQLType()).toBe('timestamp with time zone')
    expect(found.notNull).toBe(true)
    expect(found.hasDefault).toBe(true)
  })

  it('has a unique index on lower(email)', () => {
    expect(indexes).toHaveLength(1)
    expect(indexes[0]?.config.name).toBe('users_email_lower_idx')
    expect(indexes[0]?.config.unique).toBe(true)
  })
})
