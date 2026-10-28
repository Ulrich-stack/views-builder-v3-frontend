import { ActionKind, ValidationRule, Widget, WidgetAction } from '../models/widget.model';

/** Actions proposées dans le panneau Propriétés, dans l'ordre d'affichage. */
export const ACTION_KINDS: { kind: ActionKind; label: string }[] = [
  { kind: 'validate', label: 'Vérifier un champ' },
  { kind: 'show', label: 'Afficher un bloc' },
  { kind: 'hide', label: 'Masquer un bloc' },
  { kind: 'toggle', label: 'Afficher / masquer un bloc' },
  { kind: 'toast', label: 'Afficher un message' },
  { kind: 'link', label: 'Ouvrir un lien' },
  { kind: 'scrollTo', label: 'Faire défiler jusqu\'à un bloc' },
];

export const VALIDATION_RULES: { rule: ValidationRule; label: string }[] = [
  { rule: 'required', label: 'Rempli' },
  { rule: 'email', label: 'Adresse e-mail' },
  { rule: 'phone', label: 'Téléphone' },
  { rule: 'number', label: 'Nombre' },
];

/** Actions qui agissent sur un autre bloc de la page. */
export const TARGETED_KINDS: ActionKind[] = ['validate', 'show', 'hide', 'toggle', 'scrollTo'];

export const MAX_ACTIONS = 10;
const MAX_MESSAGE = 200;
const SAFE_URL = /^(https?:\/\/|mailto:|tel:|#)/i;
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Garde uniquement les actions de la liste blanche, avec leurs seuls champs utiles.
 * Sert pour tout ce qui ne vient pas du panneau (IA, sauvegarde, import).
 */
export function sanitizeActions(raw: unknown): WidgetAction[] {
  if (!Array.isArray(raw)) return [];
  const result: WidgetAction[] = [];
  for (const item of raw) {
    if (result.length >= MAX_ACTIONS) break;
    if (!item || typeof item !== 'object') continue;
    const a = item as Record<string, unknown>;
    const kind = a['do'] as ActionKind;
    if (!ACTION_KINDS.some(k => k.kind === kind)) continue;
    if (a['on'] !== undefined && a['on'] !== 'click') continue;

    const action: WidgetAction = { on: 'click', do: kind };
    if (TARGETED_KINDS.includes(kind)) {
      if (typeof a['target'] !== 'string' || !SAFE_ID.test(a['target'])) continue;
      action.target = a['target'];
    }
    const message = typeof a['message'] === 'string' ? a['message'].trim().slice(0, MAX_MESSAGE) : '';
    if (kind === 'validate') {
      action.rule = VALIDATION_RULES.some(r => r.rule === a['rule']) ? (a['rule'] as ValidationRule) : 'required';
      if (message) action.message = message;
    }
    if (kind === 'toast') {
      if (!message) continue;
      action.message = message;
    }
    if (kind === 'link') {
      const url = typeof a['url'] === 'string' ? a['url'].trim() : '';
      if (!SAFE_URL.test(url)) continue;
      action.url = url;
      if (a['newTab'] === true) action.newTab = true;
    }
    result.push(action);
  }
  return result;
}

/** Actions d'un bloc (toujours un tableau). */
export function actionsOf(widget: Widget): WidgetAction[] {
  const actions = widget.config?.['actions'];
  return Array.isArray(actions) ? actions : [];
}

/**
 * Réécrit les cibles des actions d'un arbre de blocs : `resolve` donne le nouvel identifiant,
 * ou null pour retirer l'action (cible disparue). Renvoie de nouveaux objets.
 */
export function retargetActions(widget: Widget, resolve: (target: string) => string | null): Widget {
  const actions = actionsOf(widget);
  let config = widget.config;
  if (actions.length) {
    const next = actions.flatMap(a => {
      if (!a.target) return [a];
      const target = resolve(a.target);
      return target ? [{ ...a, target }] : [];
    });
    config = { ...config, actions: next };
  }
  return {
    ...widget,
    config,
    children: widget.children?.map(c => retargetActions(c, resolve)),
  };
}

/** Styles de l'exécution des interactions (bloc masqué, erreurs de champ, message). */
export const INTERACTIONS_CSS = `.vb-hidden { display: none !important; }
/* Rouge mêlé à la couleur du texte : plus clair sur fond sombre, plus foncé sur fond clair */
.vb-invalid .vb-field, .vb-invalid.vb-framed { box-shadow: 0 0 0 2px color-mix(in srgb, #dc2626 70%, var(--text, #000)); }
.vb-error { margin-top: 6px; color: color-mix(in srgb, #dc2626 65%, var(--text, #000)); font-size: 0.85em; }
.vb-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 1000; max-width: min(90vw, 480px); padding: 12px 20px; border-radius: 10px; background: #111827; color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); font: inherit; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); animation: vb-toast-in 0.2s ease-out; }
@keyframes vb-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } }`;

/**
 * Script autonome qui exécute les interactions de la page exportée (et de l'aperçu).
 * Il lit le JSON de #vb-actions et repère les blocs grâce à leur attribut data-vb-id.
 * Aucun code n'est généré à partir des données : seules les actions connues sont exécutées.
 */
export const INTERACTIONS_RUNTIME = String.raw`(function () {
  var data = document.getElementById('vb-actions');
  var map = {};
  try { map = data ? JSON.parse(data.textContent) : {}; } catch (e) { return; }
  var blocks = {};
  document.querySelectorAll('[data-vb-id]').forEach(function (el) { blocks[el.getAttribute('data-vb-id')] = el; });

  var MESSAGES = {
    required: 'Ce champ est obligatoire.',
    email: 'Adresse e-mail invalide.',
    phone: 'Numéro de téléphone invalide.',
    number: 'Veuillez saisir un nombre.'
  };
  var RULES = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    phone: /^\+?[0-9][0-9 .()-]{6,18}[0-9]$/,
    number: /^-?[0-9]+([.,][0-9]+)?$/
  };

  function isValid(field, rule) {
    if (field.type === 'checkbox') return field.checked;
    var value = field.value.trim();
    if (!value) return false;
    return RULES[rule] ? RULES[rule].test(value) : true;
  }

  function clearError(block) {
    block.classList.remove('vb-invalid');
    var field = block.querySelector('input, textarea');
    if (field) field.removeAttribute('aria-invalid');
    var next = block.nextElementSibling;
    if (next && next.classList.contains('vb-error')) next.remove();
  }

  function validate(block, action) {
    var field = block.querySelector('input, textarea');
    if (!field) return true;
    clearError(block);
    if (isValid(field, action.rule)) return true;
    block.classList.add('vb-invalid');
    field.setAttribute('aria-invalid', 'true');
    var error = document.createElement('p');
    error.className = 'vb-error';
    error.setAttribute('role', 'alert');
    error.textContent = action.message || MESSAGES[action.rule] || MESSAGES.required;
    block.insertAdjacentElement('afterend', error);
    field.addEventListener('input', function () { clearError(block); }, { once: true });
    field.addEventListener('change', function () { clearError(block); }, { once: true });
    return false;
  }

  var toastTimer;
  function toast(message) {
    var el = document.querySelector('.vb-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'vb-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.remove(); }, 3500);
  }

  function run(actions) {
    // Toutes les vérifications sont faites (pour signaler chaque champ), puis la suite s'arrête si l'une échoue
    var failed = false;
    actions.forEach(function (action) {
      var target = action.target ? blocks[action.target] : null;
      if (action.do === 'validate') {
        if (target && !validate(target, action)) failed = true;
        return;
      }
      if (failed) return;
      switch (action.do) {
        case 'show': if (target) target.classList.remove('vb-hidden'); break;
        case 'hide': if (target) target.classList.add('vb-hidden'); break;
        case 'toggle': if (target) target.classList.toggle('vb-hidden'); break;
        case 'toast': if (action.message) toast(action.message); break;
        case 'scrollTo': if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
        case 'link':
          if (!/^(https?:\/\/|mailto:|tel:|#)/i.test(action.url || '')) break;
          if (action.newTab) window.open(action.url, '_blank', 'noopener');
          else window.location.href = action.url;
          break;
      }
    });
  }

  Object.keys(map).forEach(function (id) {
    var el = blocks[id];
    var actions = (map[id] || []).filter(function (a) { return a.on === 'click'; });
    if (!el || !actions.length) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', function (event) {
      event.stopPropagation();
      if (event.target.closest('a')) event.preventDefault();
      run(actions);
    });
  });
})();`;
