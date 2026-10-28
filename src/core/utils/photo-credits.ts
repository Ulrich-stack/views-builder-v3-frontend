import { Widget } from '../models/widget.model';

/** Crédit d'une photo trouvée par le serveur (Unsplash, Pexels) : « Nom sur Unsplash » et le lien du photographe. */
export interface PhotoCredit {
  credit: string;
  url: string | null;
}

/** Lien du crédit, seulement s'il est en https (il vient d'une réponse externe). */
export function safeCreditUrl(url: unknown): string | null {
  return typeof url === 'string' && url.startsWith('https://') ? url : null;
}

/** Crédit porté par un bloc (image ou section avec photo de fond), ou null. */
export function creditOf(widget: Widget): PhotoCredit | null {
  const credit = widget.config?.['credit'];
  if (typeof credit !== 'string' || !credit.trim()) return null;
  return { credit: credit.trim(), url: safeCreditUrl(widget.config['creditUrl']) };
}

/** Tous les crédits d'une page, sans doublon, dans l'ordre d'apparition. */
export function photoCredits(widgets: Widget[]): PhotoCredit[] {
  const credits = new Map<string, PhotoCredit>();
  const walk = (list: Widget[]) => list.forEach(w => {
    const c = creditOf(w);
    if (c && !credits.has(c.credit)) credits.set(c.credit, c);
    walk(w.children ?? []);
  });
  walk(widgets);
  return [...credits.values()];
}
