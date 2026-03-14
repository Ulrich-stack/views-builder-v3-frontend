export interface ToolboxItem {
    type: 'container' | 'text' | 'action' | 'media' | 'input' | 'blueprint';
    label: string;
    icon: string;
    element: string;
    blueprint?: any;
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
        name: 'Interactions & Formulaires',
        items: [
            { type: 'action', label: 'Bouton', icon: 'mouse-pointer-2', element: 'button' },
            { type: 'input', label: 'Champ Texte', icon: 'text-cursor-input', element: 'input' },
            { type: 'input', label: 'Zone de texte', icon: 'file-text', element: 'textarea' },
            { type: 'input', label: 'Case à cocher', icon: 'check-square', element: 'checkbox' },
        ]
    },
    {
        name: 'Blueprints Modernes',
        items: [
            {
                type: 'blueprint',
                label: 'Hero Section',
                icon: 'monitor-play',
                element: 'div',
                blueprint: {
                    styles: { 'display': 'flex', 'flex-direction': 'column', 'align-items': 'center', 'justify-content': 'center', 'text-align': 'center', 'padding': '80px 20px', 'gap': '20px', 'background-color': 'var(--bg-page)' },
                    children: [
                        { type: 'text', element: 'h1', content: 'Créez l\'Avenir Maintenant', styles: { 'font-size': 'var(--font-size-xl)', 'margin': '0', 'max-width': '800px' } },
                        { type: 'text', element: 'p', content: 'Le seul outil dont vous avez besoin pour concevoir, construire et lancer vos idées à la vitesse de la lumière.', styles: { 'color': 'var(--text-muted)', 'font-size': 'var(--font-size-lg)', 'max-width': '600px', 'margin': '0' } },
                        { 
                            type: 'container', 
                            styles: { 'display': 'flex', 'gap': '16px', 'margin-top': '20px', 'background': 'transparent', 'border': 'none', 'min-height': 'auto', 'padding': '0' },
                            children: [
                                { type: 'action', element: 'button', content: 'Commencer gratuitement', styles: { 'padding': '12px 24px' } },
                                { type: 'action', element: 'button', content: 'Voir la démo', styles: { 'padding': '12px 24px', 'background-color': 'transparent', 'border': '1px solid var(--text-muted)', 'color': 'var(--text)' } }
                            ]
                        }
                    ]
                }
            },
            {
                type: 'blueprint',
                label: 'Bento Grid',
                icon: 'layout-grid',
                element: 'div',
                blueprint: {
                    styles: { 'display': 'grid', 'grid-template-columns': 'repeat(4, 1fr)', 'grid-auto-rows': '120px', 'gap': 'var(--spacing-base)' },
                    children: [
                        { type: 'container', styles: { 'grid-column': 'span 2', 'grid-row': 'span 2', 'background-color': 'var(--surface)', 'border-radius': 'var(--radius-main)', 'padding': 'var(--spacing-base)' }, children: [{ type: 'text', element: 'h2', content: 'Main Feature' }] },
                        { type: 'container', styles: { 'grid-column': 'span 2', 'background-color': 'var(--primary)', 'border-radius': 'var(--radius-main)', 'padding': 'var(--spacing-base)' }, children: [{ type: 'text', element: 'h2', content: 'Highlight', styles: { 'color': 'white'} }] },
                        { type: 'container', styles: { 'grid-column': 'span 1', 'background-color': 'var(--surface)', 'border-radius': 'var(--radius-main)' }, children: [] },
                        { type: 'container', styles: { 'grid-column': 'span 1', 'background-color': 'var(--surface)', 'border-radius': 'var(--radius-main)' }, children: [] }
                    ]
                }
            },
            {
                type: 'blueprint',
                label: 'Pricing Card',
                icon: 'tag',
                element: 'div',
                blueprint: {
                    styles: { 'padding': '32px', 'background-color': 'var(--surface)', 'border-radius': 'var(--radius-main)', 'display': 'flex', 'flex-direction': 'column', 'gap': '16px', 'border': '1px solid rgba(255,255,255,0.05)', 'max-width': '300px' },
                    children: [
                        { type: 'text', element: 'span', content: 'PRO PLAN', styles: { 'color': 'var(--primary)', 'font-size': '12px', 'font-weight': 'bold', 'letter-spacing': '1px' } },
                        { type: 'text', element: 'h2', content: '29€ / mois', styles: { 'font-size': 'var(--font-size-xl)', 'margin': '0' } },
                        { type: 'text', element: 'p', content: 'Pour les professionnels qui veulent aller plus vite.', styles: { 'color': 'var(--text-muted)', 'font-size': '14px', 'margin': '0', 'padding-bottom': '16px', 'border-bottom': '1px solid rgba(255,255,255,0.1)' } },
                        { type: 'action', element: 'button', content: 'Souscrire maintenant', styles: { 'width': '100%', 'margin-top': '8px' } }
                    ]
                }
            },
            {
                type: 'blueprint',
                label: 'Testimonial',
                icon: 'message-square',
                element: 'div',
                blueprint: {
                    styles: { 'padding': '24px', 'background-color': 'var(--surface)', 'border-radius': 'var(--radius-main)', 'display': 'flex', 'flex-direction': 'column', 'gap': '16px' },
                    children: [
                        { type: 'text', element: 'p', content: '"Cet outil a littéralement divisé par deux notre temps de développement. C\'est un game changer absolu pour notre équipe."', styles: { 'font-style': 'italic', 'margin': '0', 'line-height': '1.5' } },
                        {
                            type: 'container',
                            styles: { 'display': 'flex', 'align-items': 'center', 'gap': '12px', 'background': 'transparent', 'border': 'none', 'min-height': 'auto', 'padding': '0' },
                            children: [
                                { type: 'media', element: 'img', config: { src: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' }, styles: { 'width': '40px', 'height': '40px', 'border-radius': '50%' } },
                                { type: 'text', element: 'span', content: 'Marie Durand, CEO', styles: { 'font-size': '14px', 'font-weight': '600' } }
                            ]
                        }
                    ]
                }
            },
            {
                type: 'blueprint',
                label: 'Newsletter Form',
                icon: 'mail',
                element: 'div',
                blueprint: {
                    styles: { 'display': 'flex', 'gap': '8px', 'width': '100%', 'max-width': '400px', 'background': 'transparent', 'border': 'none', 'padding': '0' },
                    children: [
                        { type: 'input', element: 'input', name: 'Votre adresse email...', styles: { 'flex': '1' } },
                        { type: 'action', element: 'button', content: 'S\'abonner' }
                    ]
                }
            },
            {
                type: 'blueprint',
                label: 'Glassmorphic Box',
                icon: 'layers',
                element: 'div',
                blueprint: {
                    styles: { 
                        'padding': 'var(--spacing-base)', 
                        'background-color': 'rgba(255, 255, 255, 0.03)', 
                        'backdrop-filter': 'blur(12px)', 
                        '-webkit-backdrop-filter': 'blur(12px)',
                        'border': '1px solid rgba(255, 255, 255, 0.1)',
                        'border-radius': 'var(--radius-main)',
                        'box-shadow': '0 4px 30px rgba(0, 0, 0, 0.1)'
                    },
                    children: [
                        { type: 'text', element: 'h2', content: 'Effet Glassmorphism', styles: { 'margin': '0 0 10px 0' } },
                        { type: 'text', element: 'p', content: 'Placez cette boîte au-dessus d\'une image pour voir l\'effet de verre dépoli.', styles: { 'color': 'var(--text-muted)', 'margin': '0' } }
                    ]
                }
            }
        ]
    }
];