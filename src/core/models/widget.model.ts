export type WidgetType = 'container' | 'text' | 'action' | 'input' | 'media';

export interface Widget {
    id: string; //Component ID
    type: WidgetType; // Component family
    name: string; // The name we will display in the DOM
    element: string; // HTML Component (h1, div, button,...)
    styles: Record<string, string>; // CSS styles
    config: Record<string, any> // ex: href, placeholder, class
    content?: string // Text content
    children?: Widget[] // For the container type which will have component within them
}