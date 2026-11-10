// Writes one <section> per station into `root`. Pure DOM, no 3D.
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of children) if (c != null) node.append(c);
  return node;
};

export function renderSections(root, stations) {
  for (const s of stations) {
    const card = el('div', { className: 'card' });
    card.style.setProperty('--station', s.color);
    card.append(el('p', { className: 'kicker' }, s.kicker));

    if (s.id === 'intro') {
      card.append(
        el('h1', { id: `title-${s.id}` }, s.title),
        el('p', { className: 'lead' }, 'Scroll to walk with me through 40 projects — mobile apps, edge-cloud platforms, AI pipelines and the CS foundations underneath.'),
        el('span', { className: 'hint' }, el('i'), 'scroll to start the journey'),
      );
    } else {
      card.append(el('h2', { id: `title-${s.id}` }, s.title));
    }

    if (s.projects.length) {
      const list = el('ul', { className: 'projects' });
      for (const p of s.projects) {
        const a = el('a', { className: 'project', href: p.url, target: '_blank', rel: 'noopener' },
          el('strong', {}, p.name), el('small', {}, p.desc), p.tech ? el('em', {}, p.tech) : null);
        list.append(el('li', {}, a));
      }
      card.append(list);
    }

    if (s.links) {
      card.append(el('p', { className: 'lead' }, 'Open for opportunities — Flutter, full stack and edge-cloud work.'));
      const links = el('div', { className: 'links' });
      for (const l of s.links) links.append(el('a', { href: l.url, target: l.url.startsWith('http') ? '_blank' : '', rel: 'noopener' }, l.name));
      card.append(links);
    }

    root.append(el('section', { id: `station-${s.id}`, className: 'station' }, card));
    root.lastElementChild.dataset.id = s.id;
    root.lastElementChild.setAttribute('aria-labelledby', `title-${s.id}`);
  }
}

export function renderDots(nav, stations) {
  for (const s of stations) {
    const a = el('a', { href: `#station-${s.id}` }, el('span', {}, s.id === 'intro' ? 'Start' : s.title));
    a.style.setProperty('--c', s.color);
    a.dataset.id = s.id;
    a.setAttribute('aria-label', s.id === 'intro' ? 'Start' : s.title);
    nav.append(a);
  }
}

export function setActiveDot(nav, id) {
  for (const a of nav.children) a.classList.toggle('active', a.dataset.id === id);
}
