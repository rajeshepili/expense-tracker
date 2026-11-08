import { describe, expect, it } from 'vitest'
import { formatBytes } from '#/lib/storage-usage'

describe('formatBytes', () => {
  it('labels common sizes', () => {
    expect(formatBytes(null)).toBe('—')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB')
    expect(formatBytes(4 * 1024 * 1024 * 1024)).toBe('4 GB')
  })
})
