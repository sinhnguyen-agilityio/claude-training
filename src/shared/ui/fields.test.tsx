import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { SelectField, TextField } from '@/shared/ui/fields'

describe('TextField', () => {
  it('links the label to the input', () => {
    render(<TextField label="First name" required />)
    const input = screen.getByRole('textbox', { name: /First name/ })
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-describedby')
  })

  it('describes the input with its hint and error', () => {
    render(<TextField label="Phone" hint="Optional" error="Phone is too short" />)
    const input = screen.getByRole('textbox', { name: 'Phone' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Optional Phone is too short')
  })

  it('uses a given id and forwards refs and props', async () => {
    const ref = createRef<HTMLInputElement>()
    render(<TextField label="Email" id="email" ref={ref} type="email" />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co')
    expect(ref.current).toHaveAttribute('id', 'email')
    expect(ref.current).toHaveValue('a@b.co')
  })
})

describe('SelectField', () => {
  const options = [
    { value: 'admin', label: 'Admin' },
    { value: 'viewer', label: 'Viewer' },
  ]

  it('renders options with an optional placeholder', () => {
    render(<SelectField label="Role" options={options} placeholder="Choose a role" />)
    const select = screen.getByRole('combobox', { name: 'Role' })
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Choose a role',
      'Admin',
      'Viewer',
    ])
    expect(select).toHaveValue('')
  })

  it('shows an error and forwards refs', async () => {
    const ref = createRef<HTMLSelectElement>()
    render(<SelectField label="Role" options={options} error="Choose a role" ref={ref} required />)
    const select = screen.getByRole('combobox', { name: /Role/ })
    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(select).toHaveAccessibleDescription('Choose a role')
    await userEvent.selectOptions(select, 'viewer')
    expect(ref.current).toHaveValue('viewer')
  })
})
