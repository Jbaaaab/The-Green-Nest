// Lit des frames Figma par l'API REST (le MCP du plan Starter est limité à 20 appels/mois).
// Usage : npm run figma -- <lien Figma | node-id> [...] [--scale=2]
// Jeton : FIGMA_TOKEN dans .env.local (Figma → Settings → Security → Personal access tokens,
// portée « File content : read-only »). .env.local n'est jamais commité (*.local).
// Sortie dans .figma/ (ignoré par git) : <id>.png (rendu), <id>.json (nœud complet),
// <id>.txt (résumé : calques, positions relatives à la frame, couleurs, typos).

import { mkdir, writeFile } from 'node:fs/promises'

const FILE_KEY = 'nCrXLpigcjAbPhawgdT8kV'
const OUT = '.figma'
const API = 'https://api.figma.com/v1'

try { process.loadEnvFile('.env.local') } catch {}
const token = process.env.FIGMA_TOKEN
if (!token) {
  console.error('FIGMA_TOKEN manquant : ajoute FIGMA_TOKEN=... dans .env.local')
  process.exit(1)
}

const args = process.argv.slice(2)
const scale = Number(args.find((a) => a.startsWith('--scale='))?.slice(8) ?? 1)
const targets = args.filter((a) => !a.startsWith('--'))
if (!targets.length) {
  console.error('Usage : npm run figma -- <lien Figma | node-id> [...] [--scale=2]')
  process.exit(1)
}

// Regroupe les nœuds par fichier : un seul appel « nodes » et un seul « images » par fichier.
const byFile = new Map()
for (const t of targets) {
  let key = FILE_KEY
  let id = t
  if (t.includes('figma.com')) {
    const url = new URL(t)
    const parts = url.pathname.split('/')
    key = parts[parts.indexOf('branch') + 1 || 2]
    id = url.searchParams.get('node-id')
    if (!id) {
      console.error(`Pas de node-id dans ${t}`)
      process.exit(1)
    }
  }
  id = id.replace('-', ':')
  if (!byFile.has(key)) byFile.set(key, [])
  byFile.get(key).push(id)
}

async function get(path) {
  const res = await fetch(API + path, { headers: { 'X-Figma-Token': token } })
  if (res.status === 429) {
    const wait = Number(res.headers.get('retry-after') ?? 60)
    throw new Error(`Limite de l'API atteinte, réessayer dans ${wait} s`)
  }
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.json()
}

const hex = (c, opacity = 1) => {
  const h = (v) => Math.round(v * 255).toString(16).padStart(2, '0')
  const a = (c.a ?? 1) * opacity
  return `#${h(c.r)}${h(c.g)}${h(c.b)}${a < 1 ? ` ${Math.round(a * 100)}%` : ''}`
}

const paints = (list = []) =>
  list
    .filter((p) => p.visible !== false)
    .map((p) => (p.type === 'SOLID' ? hex(p.color, p.opacity) : p.type.toLowerCase()))
    .join(' + ')

const round = (v) => Math.round(v * 100) / 100

function summarize(node, origin, depth = 0, lines = []) {
  const box = node.absoluteBoundingBox
  const pos = box
    ? `${round(box.x - origin.x)},${round(box.y - origin.y)} ${round(box.width)}×${round(box.height)}`
    : ''
  const bits = [`${'  '.repeat(depth)}${node.type} "${node.name}"`, pos]
  if (node.visible === false) bits.push('[caché]')
  if (node.rotation) bits.push(`rot ${round((node.rotation * 180) / Math.PI)}°`)
  if (node.opacity !== undefined && node.opacity < 1) bits.push(`opacité ${round(node.opacity)}`)
  const fill = paints(node.fills)
  if (fill) bits.push(`fond ${fill}`)
  const stroke = paints(node.strokes)
  if (stroke) bits.push(`trait ${stroke} ${node.strokeWeight}px`)
  if (node.cornerRadius) bits.push(`rayon ${node.cornerRadius}`)
  if (node.effects?.length) bits.push(`effets ${node.effects.map((e) => e.type.toLowerCase()).join(',')}`)
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    bits.push(`auto-layout ${node.layoutMode.toLowerCase()} gap ${node.itemSpacing ?? 0}`)
  }
  if (node.type === 'TEXT') {
    const s = node.style
    bits.push(
      `${s.fontFamily} ${s.fontWeight} ${s.fontSize}px` +
        ` interligne ${s.lineHeightPx ? round(s.lineHeightPx) + 'px' : 'auto'}` +
        ` approche ${round(s.letterSpacing ?? 0)}px` +
        (s.textCase ? ` ${s.textCase}` : '') +
        ` « ${node.characters.replace(/\n/g, '⏎')} »`,
    )
  }
  lines.push(bits.filter(Boolean).join('  '))
  for (const child of node.children ?? []) summarize(child, origin, depth + 1, lines)
  return lines
}

await mkdir(OUT, { recursive: true })

for (const [key, ids] of byFile) {
  const list = ids.join(',')
  const [nodes, images] = await Promise.all([
    get(`/files/${key}/nodes?ids=${encodeURIComponent(list)}`),
    get(`/images/${key}?ids=${encodeURIComponent(list)}&format=png&scale=${scale}`),
  ])
  for (const id of ids) {
    const doc = nodes.nodes[id]?.document
    if (!doc) {
      console.error(`${id} : introuvable`)
      continue
    }
    const name = id.replace(':', '-')
    const box = doc.absoluteBoundingBox ?? { x: 0, y: 0 }
    await writeFile(`${OUT}/${name}.json`, JSON.stringify(doc, null, 2))
    await writeFile(`${OUT}/${name}.txt`, summarize(doc, box).join('\n') + '\n')
    const png = images.images[id]
    if (png) await writeFile(`${OUT}/${name}.png`, Buffer.from(await (await fetch(png)).arrayBuffer()))
    console.log(`${id}  « ${doc.name} »  ${box.width ?? '?'}×${box.height ?? '?'}  → ${OUT}/${name}.{png,json,txt}`)
  }
}
