type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>;

/** Tiny element builder: h('div.card.big', {onclick}, ...children) */
export function h(tag: string, attrs: Attrs | Child = {}, ...children: Child[]): HTMLElement {
  if (attrs instanceof Node || typeof attrs === 'string' || attrs === null || attrs === undefined || attrs === false) {
    children.unshift(attrs as Child);
    attrs = {};
  }
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs as Attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (k === 'html') el.innerHTML = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(c));
  }
  return el;
}

export function starsRow(n: number, total = 3, cls = 'stars') {
  return h(`div.${cls}`, ...Array.from({ length: total }, (_, i) => h(`span.star${i < n ? '.on' : ''}`, '★')));
}
