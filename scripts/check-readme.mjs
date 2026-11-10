#!/usr/bin/env node
// Checks the profile README's invariants. Usage: node scripts/check-readme.mjs
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BANNED_HOSTS = ['github-readme-stats.vercel.app'];
const AVATAR = '1.jpg';

/** @param {string} md @returns {string[]} problems, empty when the README is fine */
export function checkReadme(md, { exists = () => true } = {}) {
  const problems = [];
  const lines = md.split('\n');

  // Section headings "(N Projects)" and the numbered rows under each.
  const sections = [];
  let current = null;
  const allNumbers = [];
  for (const line of lines) {
    if (line.startsWith('## ')) {
      const m = line.match(/\((\d+) Projects\)\s*$/);
      current = m ? { heading: line, declared: Number(m[1]), rows: 0 } : null;
      if (current) sections.push(current);
      continue;
    }
    const row = line.match(/^\| (\d+) \|/);
    if (row) {
      allNumbers.push(Number(row[1]));
      if (current) current.rows++;
    }
  }
  for (const s of sections) {
    if (s.declared !== s.rows) problems.push(`${s.heading}: heading says ${s.declared}, found ${s.rows}`);
  }
  for (let i = 0; i < allNumbers.length; i++) {
    const expected = i === 0 ? 1 : allNumbers[i - 1] + 1;
    if (allNumbers[i] !== expected) {
      problems.push(i === 0 ? `numbering starts at ${allNumbers[0]}` : `numbering gap after ${allNumbers[i - 1]}`);
    }
  }

  const badge = md.match(/Total_Repositories-(\d+)_Projects/);
  if (badge && Number(badge[1]) !== allNumbers.length) {
    problems.push(`total badge says ${badge[1]}, found ${allNumbers.length}`);
  }

  for (const tag of md.match(/<img\b[^>]*>/g) ?? []) {
    if (!/\balt="[^"]+"/.test(tag)) {
      const src = tag.match(/\bsrc="([^"]*)"/)?.[1] ?? tag;
      problems.push(`img without alt: ${src}`);
    }
  }

  for (const host of BANNED_HOSTS) if (md.includes(host)) problems.push(`banned host: ${host}`);
  if (!md.includes(AVATAR)) problems.push(`avatar ${AVATAR} not referenced`);

  // repo-relative images (img src / picture srcset) must be committed
  for (const m of md.matchAll(/\b(?:src|srcset)="([^"]+)"/g)) {
    const path = m[1];
    if (/^(https?:|data:|#)/.test(path)) continue;
    if (!exists(path)) problems.push(`missing local image: ${path}`);
  }

  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = new URL('../ReadMe.md', import.meta.url);
  const root = new URL('../', import.meta.url);
  const problems = checkReadme(readFileSync(path, 'utf8'), { exists: (p) => existsSync(new URL(p, root)) });
  for (const p of problems) console.log(`✗ ${p}`);
  console.log(problems.length ? `${problems.length} problem(s)` : '✓ ReadMe.md OK');
  process.exit(problems.length ? 1 : 0);
}
