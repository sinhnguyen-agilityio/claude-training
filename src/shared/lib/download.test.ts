import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadBlob, REVOKE_DELAY_MS } from '@/shared/lib/download'

describe('downloadBlob', () => {
  const created: string[] = []
  const revoked: string[] = []
  const clicked: { download: string; href: string }[] = []

  beforeEach(() => {
    vi.useFakeTimers()
    created.length = 0
    revoked.length = 0
    clicked.length = 0
    URL.createObjectURL = () => {
      created.push('blob:test')
      return 'blob:test'
    }
    URL.revokeObjectURL = (url) => void revoked.push(url)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({ download: this.download, href: this.getAttribute('href') ?? '' })
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    Reflect.deleteProperty(URL, 'createObjectURL')
    Reflect.deleteProperty(URL, 'revokeObjectURL')
  })

  it('clicks a download link and removes it again', () => {
    downloadBlob(new Blob(['x']), 'users.csv')
    expect(clicked).toEqual([{ download: 'users.csv', href: 'blob:test' }])
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('revokes the object URL only after a delay', () => {
    downloadBlob(new Blob(['x']), 'users.csv')
    expect(revoked).toEqual([])

    vi.advanceTimersByTime(REVOKE_DELAY_MS)
    expect(revoked).toEqual(['blob:test'])
  })
})
