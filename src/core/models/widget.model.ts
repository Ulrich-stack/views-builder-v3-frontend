export type WidgetType = 'container' | 'text' | 'action' | 'input' | 'media';

export interface Widget {
    id: string; //Component ID
    type: WidgetType; // Component family
    name: string; // The name we will display in the DOM
    element: string; // HTML Component (h1, div, button,...)
    styles: Record<string, string>; // CSS styles
    config: Record<string, any> // ex: href, placeholder, class, hidden (masqué au départ), actions (interactions)
    content?: string // Text content
    children?: Widget[] // For the container type which will have component within them
}

// INTERACTIONS : une liste blanche d'actions déclaratives, sans JavaScript libre
export type ActionTrigger = 'click';
export type ActionKind = 'validate' | 'show' | 'hide' | 'toggle' | 'toast' | 'link' | 'scrollTo';
export type ValidationRule = 'required' | 'email' | 'phone' | 'number';

/** Une action de config.actions, exécutée dans l'aperçu et dans la page exportée. */
export interface WidgetAction {
    on: ActionTrigger;
    do: ActionKind;
    target?: string; // id du bloc visé (validate, show, hide, toggle, scrollTo)
    rule?: ValidationRule; // validate
    message?: string; // toast, ou message d'erreur de validate
    url?: string; // link
    newTab?: boolean; // link
}
