import { Injectable } from '@angular/core';

export const AI_API_URL = 'http://localhost:8080/api/ai';

export interface GenerationResult {
  /** Type de page déduit par l'IA : persuader, operer, lire, experience */
  mode: string;
  /** Sections au format blueprint, prêtes à être insérées dans l'éditeur */
  widgets: any[];
}

/** Capture d'écran de référence, envoyée en base64. */
export interface ReferenceImage {
  mimeType: string;
  data: string;
}

export interface PageRequest {
  prompt: string;
  theme: string | null;
  /** Laisse l'IA choisir la couleur principale et le fond (clair ou sombre) de la page */
  chooseColors?: boolean;
  /** Personnalité du thème (editorial, audacieux, expressif, chaleureux), utile surtout pour un thème personnalisé */
  personality?: string;
  pageWidth: number;
  image?: ReferenceImage | null;
}

/** Palette choisie par l'IA : l'éditeur en tire toutes les couleurs du thème (generatePalette). */
export interface AiPalette {
  primary: string;
  mode: 'light' | 'dark';
}

export interface StreamHandlers {
  onSection: (widget: any) => void;
  onPalette?: (palette: AiPalette) => void;
  onMode?: (mode: string) => void;
  /** La réponse de l'IA s'est arrêtée avant la fin */
  onIncomplete?: (received: number) => void;
}

const UNREACHABLE = 'Le serveur de génération ne répond pas. Vérifiez que le backend est lancé sur le port 8080.';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  /** Génère toute la page en une fois. */
  async generate(request: PageRequest): Promise<GenerationResult> {
    const body = await this.post('/generate', request);
    if (!Array.isArray(body?.widgets) || !body.widgets.length) {
      throw new Error("L'IA n'a rien proposé. Reformulez votre demande et réessayez.");
    }
    return { mode: body.mode ?? '', widgets: body.widgets };
  }

  /**
   * Génère la page en direct : chaque section est transmise à onSection dès que le serveur l'envoie.
   * Renvoie le nombre de sections reçues.
   */
  async generateStream(request: PageRequest, handlers: StreamHandlers, signal?: AbortSignal): Promise<number> {
    let response: Response;
    try {
      response = await fetch(`${AI_API_URL}/generate/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(request),
        signal,
      });
    } catch (e) {
      if (signal?.aborted) return 0;
      throw new Error(UNREACHABLE);
    }
    if (!response.ok || !response.body) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? `La génération a échoué (erreur ${response.status}).`);
    }

    let received = 0;
    let streamError: string | null = null;
    await readServerSentEvents(response.body, (event, data) => {
      const payload = safeParse(data);
      if (event === 'section' && payload) {
        received++;
        handlers.onSection(payload);
      } else if (event === 'palette' && /^#[0-9a-f]{6}$/i.test(payload?.primary ?? '')) {
        handlers.onPalette?.({ primary: payload.primary, mode: payload.mode === 'dark' ? 'dark' : 'light' });
      } else if (event === 'mode' && payload?.mode) {
        handlers.onMode?.(payload.mode);
      } else if (event === 'incomplete') {
        handlers.onIncomplete?.(payload?.received ?? received);
      } else if (event === 'error') {
        streamError = payload?.error ?? 'La génération a échoué.';
      }
    });

    if (streamError && !received) throw new Error(streamError);
    if (!received) throw new Error("L'IA n'a rien proposé. Reformulez votre demande et réessayez.");
    return received;
  }

  /** Demande à l'IA de modifier un bloc selon une consigne ; renvoie le bloc modifié (format blueprint). */
  async edit(instruction: string, widget: any, theme: string | null, pageWidth: number): Promise<any> {
    const body = await this.post('/edit', { instruction, widget, theme, pageWidth });
    if (!body?.widget) throw new Error("L'IA n'a pas renvoyé de bloc modifié. Reformulez la consigne.");
    return body.widget;
  }

  private async post(path: string, payload: unknown): Promise<any> {
    let response: Response;
    try {
      response = await fetch(`${AI_API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error(UNREACHABLE);
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.error ?? `La demande a échoué (erreur ${response.status}).`);
    }
    return body;
  }
}

/** Lit un flux Server-Sent Events et appelle onEvent(nom, données) pour chaque événement complet. */
export async function readServerSentEvents(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: string, data: string) => void
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const flush = (block: string) => {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    }
    if (data.length) onEvent(event, data.join('\n'));
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Un événement se termine par une ligne vide
    let boundary: RegExpExecArray | null;
    while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
      flush(buffer.slice(0, boundary.index));
      buffer = buffer.slice(boundary.index + boundary[0].length);
    }
  }
  if (buffer.trim()) flush(buffer);
}

function safeParse(data: string): any {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
