import { Page } from '../models/page.model';
import { Widget } from '../models/widget.model';
import { FONTS, fontName } from '../data/themes.data';
import { iconSvg } from '../data/icons.data';
import { actionsOf, INTERACTIONS_CSS, INTERACTIONS_RUNTIME, sanitizeActions } from './interactions';

/** Échappe un texte pour l'insérer dans du HTML (contenu ou attribut). */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function styleAttr(styles: Record<string, string>): string {
  const css = Object.entries(styles)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
  return css ? ` style="${escapeHtml(css)}"` : '';
}

const hasOwnFieldFrame = (w: Widget) =>
  Object.keys(w.styles).some(k => k.startsWith('border') || k.startsWith('background'));

/** Blocs qui ont des actions ou qui sont visés par une action : ils reçoivent un attribut data-vb-id. */
function interactiveIds(widgets: Widget[], ids = new Set<string>()): Set<string> {
  for (const w of widgets) {
    const actions = actionsOf(w);
    if (actions.length) ids.add(w.id);
    for (const a of actions) if (a.target) ids.add(a.target);
    interactiveIds(w.children ?? [], ids);
  }
  return ids;
}

/** Reproduit la structure du rendu de l'éditeur : un bloc stylé qui contient l'élément sémantique. */
function renderWidget(w: Widget, indent: string, ids: Set<string>): string {
  const content = escapeHtml(w.content ?? '');
  const config = w.config ?? {};
  // Repère pour les interactions, puis styles du bloc
  const style = (ids.has(w.id) ? ` data-vb-id="${escapeHtml(w.id)}"` : '') + styleAttr(w.styles);
  const hidden = config['hidden'] === true ? ' vb-hidden' : '';

  switch (w.type) {
    case 'container': {
      const tag = w.element === 'section' || w.element === 'nav' ? w.element : 'div';
      const children = (w.children ?? []).map(c => renderWidget(c, indent + '  ', ids)).join('\n');
      const cls = hidden ? ` class="${hidden.trim()}"` : '';
      return `${indent}<${tag}${cls}${style}>\n${children}${children ? '\n' : ''}${indent}</${tag}>`;
    }
    case 'text': {
      const tag = ['h1', 'h2', 'h3', 'blockquote', 'span', 'a'].includes(w.element) ? w.element : 'p';
      const href = tag === 'a' ? ` href="${escapeHtml(config['href'] || '#')}"` : '';
      return `${indent}<div class="vb${hidden}"${style}><${tag}${href}>${content}</${tag}></div>`;
    }
    case 'action':
      return `${indent}<div class="vb${hidden}"${style}><button type="button" class="vb-button">${content}</button></div>`;
    case 'input': {
      const frame = hasOwnFieldFrame(w) ? ' vb-framed' : '';
      if (w.element === 'checkbox') {
        return `${indent}<div class="vb${hidden}"${style}><label class="vb-checkbox"><input type="checkbox"> ${escapeHtml(config['label'] ?? '')}</label></div>`;
      }
      const placeholder = escapeHtml(config['placeholder'] ?? w.name ?? '');
      const label = ` aria-label="${escapeHtml(w.name ?? '')}"`;
      const field = w.element === 'textarea'
        ? `<textarea class="vb-field" placeholder="${placeholder}"${label}></textarea>`
        : `<input type="text" class="vb-field" placeholder="${placeholder}"${label}>`;
      return `${indent}<div class="vb${frame}${hidden}"${style}>${field}</div>`;
    }
    case 'media': {
      if (w.element === 'icon') return `${indent}<div class="vb vb-icon${hidden}"${style}>${iconSvg(config['icon'])}</div>`;
      const src = config['src'];
      if (!src) return `${indent}<div class="vb${hidden}"${style}></div>`;
      const media = w.element === 'video'
        ? `<video src="${escapeHtml(src)}" controls></video>`
        : `<img src="${escapeHtml(src)}" alt="${escapeHtml(config['alt'] ?? '')}" loading="lazy">`;
      return `${indent}<div class="vb${hidden}"${style}>${media}</div>`;
    }
    default:
      return '';
  }
}

function googleFontsUrl(families: string[]): string | null {
  const fonts = [...new Set(families.map(fontName))]
    .map(name => FONTS.find(f => f.name === name))
    .filter((f): f is (typeof FONTS)[number] => !!f);
  if (!fonts.length) return null;
  return 'https://fonts.googleapis.com/css2?' +
    fonts.map(f => `family=${f.name.replace(/ /g, '+')}:wght@${f.weights}`).join('&') + '&display=swap';
}

/** Styles de base identiques à ceux du rendu de l'éditeur. */
const BASE_CSS = `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--bg-page); color: var(--text); font-family: var(--font-family); -webkit-font-smoothing: antialiased; }
.vb { position: relative; }
.vb > h1, .vb > h2, .vb > h3, .vb > blockquote, .vb > p, .vb > span, .vb > a { margin: 0; font: inherit; color: inherit; text-decoration: none; display: block; }
.vb-icon > svg { display: block; width: 100%; height: 100%; }
.vb-button { all: unset; display: block; width: 100%; text-align: center; white-space: nowrap; cursor: pointer; font: inherit; color: inherit; }
.vb-button:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
.vb > img, .vb > video { display: block; width: 100%; height: 100%; max-width: 100%; object-fit: cover; }
.vb-field { width: 100%; background: rgba(255, 255, 255, 0.05); border: 1px solid color-mix(in srgb, var(--text) 20%, transparent); color: inherit; padding: 8px 12px; border-radius: var(--radius-main); font: inherit; }
.vb-framed > .vb-field { background: transparent; border: none; border-radius: 0; padding: 0; resize: none; outline: none; }
.vb-checkbox { display: inline-flex; align-items: center; gap: 8px; }
${INTERACTIONS_CSS}`;

/** Actions de la page, par bloc. Le JSON est rendu sûr à l'intérieur d'une balise <script>. */
function actionsScript(widgets: Widget[]): string {
  const map: Record<string, unknown> = {};
  const collect = (list: Widget[]) => list.forEach(w => {
    const actions = sanitizeActions(actionsOf(w));
    if (actions.length) map[w.id] = actions;
    collect(w.children ?? []);
  });
  collect(widgets);
  if (!Object.keys(map).length) return '';
  const json = JSON.stringify(map)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `<script type="application/json" id="vb-actions">${json}</script>\n<script>\n${INTERACTIONS_RUNTIME}\n</script>\n`;
}

/**
 * Exporte une page en un fichier HTML autonome : variables du thème, polices et styles de chaque bloc.
 * @param variables les variables CSS du design system (EditorService.globalVariables())
 */
export function exportPageHtml(page: Page, variables: Record<string, string>): string {
  const vars = Object.entries(variables).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  const fonts = googleFontsUrl([variables['--font-family'], variables['--font-family-heading']].filter(Boolean));
  const ids = interactiveIds(page.widgets);
  const body = page.widgets.map(w => renderWidget(w, '  ', ids)).join('\n');
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(page.name)}</title>
${fonts ? `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="${escapeHtml(fonts)}">\n` : ''}<style>
:root {
${vars}
}
${BASE_CSS}
</style>
</head>
<body>
${body}
${actionsScript(page.widgets)}</body>
</html>
`;
}

/** Nom de fichier lisible à partir du nom de la page. */
export function exportFileName(page: Page): string {
  const slug = page.name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'page'}.html`;
}
