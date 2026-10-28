import { contrastRatio, rgbToHex } from './color';

type Rgba = [number, number, number, number];

export interface ReadabilityIssue {
  /** Identifiant du bloc concerné, pour le sélectionner */
  widgetId: string;
  /** Début du texte, pour reconnaître le bloc */
  text: string;
  ratio: number;
  /** Contraste minimum attendu (4,5 pour le texte courant, 3 pour le grand texte) */
  minimum: number;
  /** Couleurs mesurées (hexadécimal), pour regrouper les problèmes qui ont la même cause */
  color: string;
  background: string;
}

/** Problèmes qui partagent les mêmes couleurs de texte et de fond : ils ont une seule et même cause. */
export interface ReadabilityGroup {
  color: string;
  background: string;
  ratio: number;
  minimum: number;
  issues: ReadabilityIssue[];
}

export function groupIssues(issues: ReadabilityIssue[]): ReadabilityGroup[] {
  const groups = new Map<string, ReadabilityGroup>();
  for (const issue of issues) {
    const key = `${issue.color}|${issue.background}|${issue.minimum}`;
    const group = groups.get(key) ?? { color: issue.color, background: issue.background, ratio: issue.ratio, minimum: issue.minimum, issues: [] };
    group.issues.push(issue);
    groups.set(key, group);
  }
  // Les plus gros problèmes d'abord
  return [...groups.values()].sort((a, b) => a.ratio / a.minimum - b.ratio / b.minimum);
}

/**
 * Lit une couleur calculée par le navigateur : rgb()/rgba() ou color(srgb ...), forme que prennent
 * les couleurs issues de color-mix(). Renvoie null pour un format inconnu.
 */
export function parseCssColor(value: string): Rgba | null {
  const v = value.trim();
  if (v === 'transparent') return [0, 0, 0, 0];
  let m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(v);
  if (m) return [+m[1], +m[2], +m[3], alpha(m[4])];
  m = /^color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(v);
  if (m) return [+m[1] * 255, +m[2] * 255, +m[3] * 255, alpha(m[4])];
  return null;
}

function alpha(raw: string | undefined): number {
  if (raw === undefined) return 1;
  return raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw);
}

/** Superpose une couleur (éventuellement transparente) sur un fond opaque. */
export function blend(top: Rgba, bottom: Rgba): Rgba {
  const a = top[3];
  return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
}

function toHex(c: Rgba): string {
  return rgbToHex(Math.round(c[0]), Math.round(c[1]), Math.round(c[2]));
}

/** Fond réellement visible derrière un élément : empile les fonds des parents jusqu'au premier opaque. */
function effectiveBackground(el: HTMLElement, stopAt: HTMLElement): Rgba {
  const layers: Rgba[] = [];
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const bg = parseCssColor(getComputedStyle(node).backgroundColor);
    if (bg && bg[3] > 0) {
      layers.push(bg);
      if (bg[3] >= 1) break;
    }
    if (node === stopAt) break;
  }
  let result: Rgba = [255, 255, 255, 1];
  for (let i = layers.length - 1; i >= 0; i--) result = blend(layers[i], result);
  return result;
}

function isLargeText(style: CSSStyleDeclaration): boolean {
  const size = parseFloat(style.fontSize);
  const bold = parseInt(style.fontWeight, 10) >= 700;
  return size >= 24 || (bold && size >= 18.66);
}

/**
 * Vérifie le contraste de chaque texte affiché dans une page de l'éditeur (critères WCAG AA).
 * Les images de fond ne sont pas prises en compte.
 */
export function auditReadability(page: HTMLElement): ReadabilityIssue[] {
  const issues: ReadabilityIssue[] = [];
  const seen = new Set<string>();
  page.querySelectorAll<HTMLElement>('[data-editable], .checkbox-render').forEach(el => {
    const text = el.textContent?.trim() ?? '';
    const wrapper = el.closest<HTMLElement>('.widget-wrapper');
    if (!text || !wrapper || seen.has(wrapper.id)) return;

    const style = getComputedStyle(el);
    const color = parseCssColor(style.color);
    if (!color) return;
    const background = effectiveBackground(el, page);
    const textHex = toHex(blend(color, background));
    const backgroundHex = toHex(background);
    const ratio = contrastRatio(textHex, backgroundHex);
    const minimum = isLargeText(style) ? 3 : 4.5;
    if (ratio < minimum) {
      seen.add(wrapper.id);
      issues.push({
        widgetId: wrapper.id,
        text: text.length > 40 ? text.slice(0, 40) + '…' : text,
        ratio,
        minimum,
        color: textHex,
        background: backgroundHex,
      });
    }
  });
  return issues;
}
