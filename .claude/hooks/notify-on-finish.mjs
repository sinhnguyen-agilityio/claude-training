// Stop hook: shows a Windows toast + sound when Claude finishes a turn.
// Notification only: always exits 0 and never prints a decision, so it cannot block Claude.
// Title/body travel via env vars (NOTIFY_TITLE / NOTIFY_BODY), never inside the command string.
// NOTIFY_DRY_RUN=1 prints what would run (as JSON) instead of showing a toast.
import { readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { win32 } from 'node:path'

const TITLE = 'Claude Code'

// Fixed script: reads its text from the environment, so stdin data is never parsed as code.
const PS_SCRIPT = `
$ErrorActionPreference = 'Stop'
try {
  [void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
  $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
  $text = $xml.GetElementsByTagName('text')
  [void]$text.Item(0).AppendChild($xml.CreateTextNode($env:NOTIFY_TITLE))
  [void]$text.Item(1).AppendChild($xml.CreateTextNode($env:NOTIFY_BODY))
  $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
  $appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show($toast)
} catch {}
[System.Media.SystemSounds]::Asterisk.Play()
Start-Sleep -Milliseconds 800
`

const PS_ARGS = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', PS_SCRIPT]

function readCwd() {
  let raw = ''
  try {
    raw = readFileSync(0, 'utf8')
  } catch {
    return null
  }
  try {
    const cwd = JSON.parse(raw)?.cwd
    return typeof cwd === 'string' ? cwd : ''
  } catch {
    return null
  }
}

function main() {
  if (process.platform !== 'win32') return

  const cwd = readCwd()
  if (cwd === null) return

  const folder = win32.basename(cwd.trim().replace(/[\\/]+$/, ''))
  const body = folder ? `Done: ${folder}` : 'Done'

  if (process.env.NOTIFY_DRY_RUN === '1') {
    console.log(JSON.stringify({ title: TITLE, body, command: 'powershell.exe', args: PS_ARGS }))
    return
  }

  try {
    const child = spawn('powershell.exe', PS_ARGS, {
      env: { ...process.env, NOTIFY_TITLE: TITLE, NOTIFY_BODY: body },
      // Not `detached`: a detached powershell.exe never starts here. It is also killed if this
      // process exits first, so wait for it (a few seconds at most) instead of unref()-ing it.
      stdio: 'ignore',
      windowsHide: true,
    })
    child.on('error', () => process.exit(0))
    child.on('exit', () => process.exit(0))
    setTimeout(() => process.exit(0), 5000)
  } catch {
    // spawn failure must never affect Claude
  }
}

try {
  main()
} catch {
  // notification-only: swallow everything
}
process.exitCode = 0
