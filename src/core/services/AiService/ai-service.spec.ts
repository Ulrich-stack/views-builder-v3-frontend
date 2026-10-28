import { readServerSentEvents } from './ai-service';
import { toBlueprint } from './ai-editor';

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      chunks.forEach(c => controller.enqueue(encoder.encode(c)));
      controller.close();
    },
  });
}

describe('readServerSentEvents', () => {
  it('reconstitue les événements même découpés en plusieurs morceaux', async () => {
    const events: [string, string][] = [];
    await readServerSentEvents(
      streamOf(['event:mode\ndata:{"mode":"lire"}\n\nevent:sec', 'tion\ndata:{"type":"container"}\n', '\nevent:done\ndata:{"count":1}\n\n']),
      (event, data) => events.push([event, data])
    );
    expect(events).toEqual([
      ['mode', '{"mode":"lire"}'],
      ['section', '{"type":"container"}'],
      ['done', '{"count":1}'],
    ]);
  });
});

describe('toBlueprint', () => {
  it("retire les identifiants internes avant l'envoi à l'IA", () => {
    const blueprint = toBlueprint({
      id: 'a', type: 'container', element: 'div', name: 'Bloc', styles: {}, config: {},
      children: [{ id: 'b', type: 'text', element: 'p', name: 'Texte', styles: {}, config: {}, content: 'x' }],
    });
    expect(blueprint.id).toBeUndefined();
    expect(blueprint.children[0].id).toBeUndefined();
    expect(blueprint.children[0].content).toBe('x');
  });

  it('remplace les identifiants par des repères courts, y compris dans les cibles des actions', () => {
    const refs: Record<string, string> = {};
    const blueprint = toBlueprint({
      id: 'uuid-form', type: 'container', element: 'div', name: 'Formulaire', styles: {}, config: {},
      children: [
        { id: 'uuid-mail', type: 'input', element: 'input', name: 'E-mail', styles: {}, config: {} },
        { id: 'uuid-btn', type: 'action', element: 'button', name: 'Bouton', styles: {}, content: 'Envoyer',
          config: { actions: [
            { on: 'click', do: 'validate', target: 'uuid-mail', rule: 'email' },
            { on: 'click', do: 'show', target: 'uuid-outside' },
          ] } },
      ],
    }, refs);
    expect(blueprint.ref).toBe('b1');
    expect(blueprint.children.map((c: any) => c.ref)).toEqual(['b2', 'b3']);
    expect(blueprint.children[1].config.actions[0].target).toBe('b2');
    // Une cible hors du bloc garde son identifiant
    expect(blueprint.children[1].config.actions[1].target).toBe('uuid-outside');
    expect(refs).toEqual({ b1: 'uuid-form', b2: 'uuid-mail', b3: 'uuid-btn' });
  });
});

describe('AiService.generateStream', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => (globalThis.fetch = realFetch));

  it('transmet la palette choisie par l\'IA et ignore une palette invalide', async () => {
    const { AiService } = await import('./ai-service');
    globalThis.fetch = (async () => new Response(streamOf([
      'event:palette\ndata:{"primary":"#7a8b6f","mode":"dark"}\n\n',
      'event:palette\ndata:{"primary":"rouge"}\n\n',
      'event:section\ndata:{"type":"container","children":[]}\n\n',
    ]), { status: 200 })) as typeof fetch;
    const palettes: unknown[] = [];
    const count = await new AiService().generateStream(
      { prompt: 'yoga', theme: null, pageWidth: 1280, chooseColors: true },
      { onSection: () => {}, onPalette: p => palettes.push(p) }
    );
    expect(count).toBe(1);
    expect(palettes).toEqual([{ primary: '#7a8b6f', mode: 'dark' }]);
  });
});
