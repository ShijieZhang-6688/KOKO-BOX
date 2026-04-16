import { existsSync } from 'node:fs'
import { cp, mkdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const sourceDir = path.join(root, 'static', 'tab')
const targetDir = path.join(root, 'unpackage', 'dist', 'build', 'mp-weixin', 'static', 'tab')

async function main() {
  if (!existsSync(sourceDir)) {
    console.warn(`[copy-tab-icons] Source directory not found: ${sourceDir}`)
    return
  }

  await mkdir(targetDir, { recursive: true })
  await cp(sourceDir, targetDir, { recursive: true, force: true })
  console.log(`[copy-tab-icons] Copied tab icons to ${targetDir}`)
}

main().catch((error) => {
  console.error('[copy-tab-icons] Failed to copy tab icons:', error)
  process.exit(1)
})
