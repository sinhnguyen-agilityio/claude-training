/** How long the object URL stays valid, so the browser can start reading the blob. */
export const REVOKE_DELAY_MS = 1000

/** Starts a browser download of `blob` as `filename`. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Some browsers read the blob after `click()` returns, so revoking right away can empty the file.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}
