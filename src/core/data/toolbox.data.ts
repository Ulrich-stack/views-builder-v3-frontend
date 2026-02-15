export interface ToolboxItem {
    type: 'container' | 'text' | 'action' | 'media' | 'input';
    label: string;
    icon: string;
    element: string;
}

export interface ToolboxCategory {
    name: string;
    items: ToolboxItem[];
}

export const WIDGET_CATALOG: ToolboxCategory[] = [
    {
        name: 'Structure',
        items: [
            { type: 'container', label: 'Section', icon: 'layout-template', element: 'section' },
            { type: 'container', label: 'Conteneur', icon: 'box', element: 'div' },
            { type: 'container', label: 'Grille (Row)', icon: 'columns-2', element: 'grid' },
            { type: 'container', label: 'Navigation', icon: 'menu', element: 'nav' }
        ]
    },
    {
        name: 'Contenu',
        items: [
            { type: 'text', label: 'Titre H1', icon: 'heading-1', element: 'h1' },
            { type: 'text', label: 'Titre H2', icon: 'heading-2', element: 'h2' },
            { type: 'text', label: 'Paragraphe', icon: 'align-left', element: 'p' },
            { type: 'text', label: 'Texte (Span)', icon: 'type', element: 'span' },
            { type: 'text', label: 'Lien simple', icon: 'link', element: 'a' },
        ]
    },
    {
        name: 'Média',
        items: [
            { type: 'media', label: 'Image', icon: 'image', element: 'img' },
            { type: 'media', label: 'Vidéo', icon: 'video', element: 'video' },
            { type: 'media', label: 'Icône', icon: 'smile', element: 'lucide-icon' },
        ]
    },
    {
        name: 'Interactions',
        items: [
            { type: 'action', label: 'Bouton', icon: 'mouse-pointer-2', element: 'button' },
            { type: 'action', label: 'Bouton Icône', icon: 'plus-square', element: 'button-icon' },
        ]
    },
    {
        name: 'Formulaire',
        items: [
            { type: 'input', label: 'Champ Texte', icon: 'text-cursor-input', element: 'input' },
            { type: 'input', label: 'Zone de texte', icon: 'file-text', element: 'textarea' },
            { type: 'input', label: 'Sélection', icon: 'list-ordered', element: 'select' },
            { type: 'input', label: 'Case à cocher', icon: 'check-square', element: 'checkbox' },
            
        ]
    }
]