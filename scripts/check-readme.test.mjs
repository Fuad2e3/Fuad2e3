import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkReadme } from './check-readme.mjs';

const row = (n) => `| ${n} | **P${n}** | d | t | l |`;
const fixture = ({ badge = 3, a = [1, 2], b = [3], extra = '' } = {}) => `
<img src="1.jpg" alt="me" />
<img src="https://img.shields.io/badge/Total_Repositories-${badge}_Projects-00C2FF" alt="count" />

## 📱 Mobile (${a.length} Projects)

| # | Project | Focus | Tech | Repo |
| :-: | :--- | :--- | :--- | :--- |
${a.map(row).join('\n')}

---

## 🌐 Web (${b.length} Projects)

| # | Project | Focus | Tech | Repo |
| :-: | :--- | :--- | :--- | :--- |
${b.map(row).join('\n')}
${extra}
`;

test('counts match', () => {
  assert.deepEqual(checkReadme(fixture()), []);
  const problems = checkReadme(fixture({ badge: 4 }));
  assert.ok(problems.some((p) => p.includes('badge says 4, found 3')), problems.join('\n'));
});

test('section count mismatch is reported', () => {
  const md = fixture().replace('(2 Projects)', '(5 Projects)');
  assert.ok(checkReadme(md).some((p) => p.includes('heading says 5, found 2')));
});

test('numbering continuous', () => {
  const problems = checkReadme(fixture({ a: [1, 2], b: [4] }));
  assert.ok(problems.some((p) => p.includes('numbering gap after 2')), problems.join('\n'));
});

test('img alt required', () => {
  const problems = checkReadme(fixture({ extra: '<img src="x.svg" />' }));
  assert.ok(problems.includes('img without alt: x.svg'), problems.join('\n'));
});

test('banned host', () => {
  const problems = checkReadme(
    fixture({ extra: '<img src="https://github-readme-stats.vercel.app/api?u=1" alt="s" />' }),
  );
  assert.ok(problems.includes('banned host: github-readme-stats.vercel.app'), problems.join('\n'));
});

test('avatar used', () => {
  const problems = checkReadme(fixture().replace('<img src="1.jpg" alt="me" />', ''));
  assert.ok(problems.includes('avatar 1.jpg not referenced'), problems.join('\n'));
});

test('real README passes', { todo: 'enabled at the end of README plan Task 3' }, () => {
  assert.deepEqual(checkReadme(readFileSync(new URL('../ReadMe.md', import.meta.url), 'utf8')), []);
});
