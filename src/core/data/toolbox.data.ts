export type BlueprintThumb =
    | 'menu' | 'hero' | 'text-image' | 'bento' | 'gallery' | 'pricing'
    | 'testimonial' | 'newsletter' | 'glass' | 'footer';

export interface ToolboxItem {
    type: 'container' | 'text' | 'action' | 'media' | 'input' | 'blueprint';
    label: string;
    icon: string;
    element: string;
    /** Phrase courte affichée au survol, en langage simple */
    description?: string;
    /** Mots-clés supplémentaires pour la recherche */
    keywords?: string;
    /** Miniature dessinée dans la boîte à composants (sections prêtes) */
    thumb?: BlueprintThumb;
    blueprint?: any;
}

export interface ToolboxCategory {
    name: string;
    description?: string;
    items: ToolboxItem[];
}

export const BLUEPRINT_CATEGORY = 'Sections toutes prêtes';

const img = (seed: string, w = 800, h = 600) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

const transparentBox = { 'background': 'transparent', 'border': 'none', 'min-height': 'auto', 'padding': '0' };

export const WIDGET_CATALOG: ToolboxCategory[] = [
    {
        name: BLUEPRINT_CATEGORY,
        description: 'Des blocs complets, déjà mis en forme',
        items: [
            {
                type: 'blueprint',
                label: 'Menu',
                icon: 'panel-top',
                element: 'nav',
                thumb: 'menu',
                description: 'Logo, liens de navigation et bouton',
                keywords: 'navigation entête header barre',
                blueprint: {
                    element: 'nav',
                    styles: { 'display': 'flex', 'align-items': 'center', 'justify-content': 'space-between', 'flex-wrap': 'wrap', 'gap': '16px', 'padding': '16px 24px', 'width': '100%' },
                    children: [
                        { type: 'text', element: 'span', name: 'Logo', content: '● MonSite', styles: { 'font-family': 'var(--font-family-heading)', 'font-size': 'var(--font-size-lg)', 'font-weight': '700', 'color': 'var(--primary)' } },
                        {
                            type: 'container', name: 'Liens',
                            styles: { ...transparentBox, 'display': 'flex', 'align-items': 'center', 'gap': '24px' },
                            children: [
                                { type: 'text', element: 'a', name: 'Lien', content: 'Accueil', config: { href: '' } },
                                { type: 'text', element: 'a', name: 'Lien', content: 'Services', config: { href: '' } },
                                { type: 'text', element: 'a', name: 'Lien', content: 'Contact', config: { href: '' } },
                                { type: 'action', element: 'button', name: 'Bouton', content: 'Me contacter', styles: { 'padding': '10px 18px' } }
                            ]
                        }
                    ]
                }
            },
            {
                type: 'blueprint',
                label: 'Bannière d\'accueil',
                icon: 'monitor-play',
                element: 'div',
                thumb: 'hero',
                description: 'Grand titre accrocheur avec deux boutons',
                keywords: 'hero header accueil titre',
                blueprint: {
                    styles: { 'display': 'flex', 'flex-direction': 'column', 'align-items': 'center', 'justify-content': 'center', 'text-align': 'center', 'padding': '80px 20px', 'gap': '20px', 'background-color': 'var(--bg-page)' },
                    children: [
                        { type: 'text', element: 'h1', name: 'Titre', content: 'Créez l\'Avenir Maintenant', styles: { 'font-size': 'var(--font-size-xl)', 'font-weight': '700', 'margin': '0', 'max-width': '800px' } },
                        { type: 'text', element: 'p', name: 'Paragraphe', content: 'Le seul outil dont vous avez besoin pour concevoir, construire et lancer vos idées à la vitesse de la lumière.', styles: { 'color': 'var(--text-muted)', 'font-size': 'var(--font-size-lg)', 'max-width': '600px', 'margin': '0' } },
                        {
                            type: 'container', name: 'Boutons',
                            styles: { ...transparentBox, 'display': 'flex', 'gap': '16px', 'margin-top': '20px' },
                            children: [
                                { type: 'action', element: 'button', name: 'Bouton', content: 'Commencer gratuitement', styles: { 'padding': '12px 24px' } },
                                { type: 'action', element: 'button', name: 'Bouton', content: 'Voir la démo', styles: { 'padding': '12px 24px', 'background-color': 'transparent', 'border': '1px solid var(--text-muted)', 'color': 'var(--text)' } }
                            ]
                        }
                    ]
                }
            },
            {
                type: 'blueprint',
                label: 'Texte + image',
                icon: 'columns-2',
                element: 'div',
                thumb: 'text-image',
                description: 'Un texte à gauche, une photo à droite',
                keywords: 'présentation à propos colonnes photo',
                blueprint: {
                    styles: { 'display': 'grid', 'grid-template-columns': 'repeat(2, 1fr)', 'align-items': 'center', 'gap': '40px', 'padding': '48px 24px' },
                    children: [
                        {
                            type: 'container', name: 'Texte',
                            styles: { ...transparentBox, 'display': 'flex', 'flex-direction': 'column', 'align-items': 'flex-start', 'gap': '16px' },
                            children: [
                                { type: 'text', element: 'h2', name: 'Titre', content: 'Une histoire à raconter', styles: { 'font-size': 'var(--font-size-xl)', 'font-weight': '700' } },
                                { type: 'text', element: 'p', name: 'Paragraphe', content: 'Présentez votre activité, votre équipe ou votre produit. Quelques phrases simples suffisent pour donner envie d\'en savoir plus.', styles: { 'color': 'var(--text-muted)', 'line-height': '1.6' } },
                                { type: 'action', element: 'button', name: 'Bouton', content: 'Découvrir', styles: { 'padding': '12px 24px' } }
                            ]
                        },
                        { type: 'media', element: 'img', name: 'Image', config: { src: img('presentation'), alt: '' }, styles: { 'border-radius': 'var(--radius-main)', 'overflow': 'hidden' } }
                    ]
                }
            },
            {
                type: 'blueprint',
                label: 'Mosaïque',
                icon: 'layout-grid',
                element: 'div',
                thumb: 'bento',
                description: 'Grille de cases de tailles différentes',
                keywords: 'bento grid grille fonctionnalités',
                blueprint: {
                    styles: { 'display': 'grid', 'grid-template-columns': 'repeat(4, 1fr)', 'grid-auto-rows': '120px', 'gap': 'var(--spacing-base)' },
                    children: [
                        { type: 'container', name: 'Case', styles: { 'grid-column': 'span 2', 'grid-row': 'span 2', 'background-color': 'var(--surface)', 'border-radius': 'var(--radius-main)', 'padding': 'var(--spacing-base)' }, children: [{ type: 'text', element: 'h2', name: 'Titre', content: 'Main Feature', styles: { 'font-size': 'var(--font-size-lg)', 'font-weight': '700' } }] },
                        { type: 'container', name: 'Case', styles: { 'grid-column': 'span 2', 'background-color': 'var(--primary)', 'border-radius': 'var(--radius-main)', 'padding': 'var(--spacing-base)' }, children: [{ type: 'text', element: 'h2', name: 'Titre', content: 'Highlight', styles: { 'color': 'var(--on-primary)', 'font-size': 'var(--font-size-lg)', 'font-weight': '700' } }] },
                        { type: 'container', name: 'Case', styles: { 'grid-column': 'span 1', 'background-color': 'var(--surface)', 'border-radius': 'var(--radius-main)' }, children: [] },
                        { type: 'container', name: 'Case', styles: { 'grid-column': 'span 1', 'background-color': 'var(--surface)', 'border-radius': 'var(--radius-main)' }, children: [] }
                    ]
                }
            },
            {
                type: 'blueprint',
                label: 'Galerie photos',
                icon: 'images',
                element: 'div',
                thumb: 'gallery',
                description: 'Un titre et trois photos alignées',
                keywords: 'images portfolio photos',
                blueprint: {
                    styles: { 'display': 'flex', 'flex-direction': 'column', 'gap': '24px', 'padding': '48px 24px' },
                    children: [
                        { type: 'text', element: 'h2', name: 'Titre', content: 'Nos réalisations', styles: { 'font-size': 'var(--font-size-xl)', 'font-weight': '700', 'text-align': 'center' } },
                        {
                            type: 'container', name: 'Photos',
                            styles: { ...transparentBox, 'display': 'grid', 'grid-template-columns': 'repeat(3, 1fr)', 'gap': '12px' },
                            children: ['galerie-1', 'galerie-2', 'galerie-3'].map(seed => (
                                { type: 'media', element: 'img', name: 'Photo', config: { src: img(seed, 600, 600), alt: '' }, styles: { 'aspect-ratio': '1', 'border-radius': 'var(--radius-main)', 'overflow': 'hidden' } }
                            ))
                        }
                    ]
                }
            },
            {
                type: 'blueprint',
                label: 'Carte tarif',
                icon: 'tag',
                element: 'div',
                thumb: 'pricing',
                description: 'Une offre avec son prix et un bouton',
                keywords: 'pricing prix abonnement offre',
                blueprint: {
                    styles: { 'padding': '32px', 'background-color': 'var(--surface)', 'border-radius': 'var(--radius-main)', 'display': 'flex', 'flex-direction': 'column', 'gap': '16px', 'border': '1px solid rgba(128,128,128,0.15)', 'max-width': '300px' },
                    children: [
                        { type: 'text', element: 'span', name: 'Étiquette', content: 'PRO PLAN', styles: { 'color': 'var(--primary)', 'font-size': '12px', 'font-weight': '700', 'letter-spacing': '1px' } },
                        { type: 'text', element: 'h2', name: 'Prix', content: '29€ / mois', styles: { 'font-size': 'var(--font-size-xl)', 'font-weight': '700', 'margin': '0' } },
                        { type: 'text', element: 'p', name: 'Description', content: 'Pour les professionnels qui veulent aller plus vite.', styles: { 'color': 'var(--text-muted)', 'font-size': '14px', 'margin': '0', 'padding-bottom': '16px', 'border-bottom': '1px solid rgba(128,128,128,0.2)' } },
                        { type: 'action', element: 'button', name: 'Bouton', content: 'Souscrire maintenant', styles: { 'display': 'block', 'margin-top': '8px' } }
                    ]
                }
            },
            {
                type: 'blueprint',
                label: 'Témoignage',
                icon: 'message-square',
                element: 'div',
                thumb: 'testimonial',
                description: 'Une citation de client avec sa photo',
                keywords: 'avis client citation testimonial',
                blueprint: {
                    styles: { 'padding': '24px', 'background-color': 'var(--surface)', 'border-radius': 'var(--radius-main)', 'display': 'flex', 'flex-direction': 'column', 'gap': '16px' },
                    children: [
                        { type: 'text', element: 'p', name: 'Citation', content: '"Cet outil a littéralement divisé par deux notre temps de développement. C\'est un game changer absolu pour notre équipe."', styles: { 'font-style': 'italic', 'margin': '0', 'line-height': '1.5' } },
                        {
                            type: 'container', name: 'Auteur',
                            styles: { ...transparentBox, 'display': 'flex', 'align-items': 'center', 'gap': '12px' },
                            children: [
                                { type: 'media', element: 'img', name: 'Photo', config: { src: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', alt: '' }, styles: { 'width': '40px', 'height': '40px', 'border-radius': '50%', 'overflow': 'hidden' } },
                                { type: 'text', element: 'span', name: 'Nom', content: 'Marie Durand, CEO', styles: { 'font-size': '14px', 'font-weight': '600' } }
                            ]
                        }
                    ]
                }
            },
            {
                type: 'blueprint',
                label: 'Inscription newsletter',
                icon: 'mail',
                element: 'div',
                thumb: 'newsletter',
                description: 'Un champ e-mail et un bouton',
                keywords: 'email formulaire abonnement',
                blueprint: {
                    styles: { 'display': 'flex', 'gap': '8px', 'width': '100%', 'max-width': '400px', 'background': 'transparent', 'border': 'none', 'padding': '0' },
                    children: [
                        { type: 'input', element: 'input', name: 'Champ e-mail', config: { placeholder: 'Votre adresse email...' }, styles: { 'flex': '1' } },
                        { type: 'action', element: 'button', name: 'Bouton', content: 'S\'abonner' }
                    ]
                }
            },
            {
                type: 'blueprint',
                label: 'Encadré verre',
                icon: 'layers',
                element: 'div',
                thumb: 'glass',
                description: 'Boîte effet verre dépoli',
                keywords: 'glassmorphism carte effet',
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
                        { type: 'text', element: 'h2', name: 'Titre', content: 'Effet Glassmorphism', styles: { 'font-size': 'var(--font-size-lg)', 'font-weight': '700', 'margin': '0 0 10px 0' } },
                        { type: 'text', element: 'p', name: 'Paragraphe', content: 'Placez cette boîte au-dessus d\'une image pour voir l\'effet de verre dépoli.', styles: { 'color': 'var(--text-muted)', 'margin': '0' } }
                    ]
                }
            },
            {
                type: 'blueprint',
                label: 'Pied de page',
                icon: 'panel-bottom',
                element: 'footer',
                thumb: 'footer',
                description: 'Copyright et liens utiles en bas de page',
                keywords: 'footer bas mentions légales',
                blueprint: {
                    element: 'footer',
                    styles: { 'display': 'flex', 'align-items': 'center', 'justify-content': 'space-between', 'flex-wrap': 'wrap', 'gap': '16px', 'padding': '32px 24px', 'border-top': '1px solid rgba(128,128,128,0.25)', 'color': 'var(--text-muted)', 'font-size': '14px' },
                    children: [
                        { type: 'text', element: 'span', name: 'Copyright', content: '© 2026 MonSite. Tous droits réservés.' },
                        {
                            type: 'container', name: 'Liens',
                            styles: { ...transparentBox, 'display': 'flex', 'gap': '20px' },
                            children: [
                                { type: 'text', element: 'a', name: 'Lien', content: 'Mentions légales', config: { href: '' } },
                                { type: 'text', element: 'a', name: 'Lien', content: 'Contact', config: { href: '' } }
                            ]
                        }
                    ]
                }
            }
        ]
    },
    {
        name: 'Textes',
        items: [
            { type: 'text', label: 'Grand titre', icon: 'heading-1', element: 'h1', description: 'Le titre principal de la page', keywords: 'h1 titre' },
            { type: 'text', label: 'Sous-titre', icon: 'heading-2', element: 'h2', description: 'Le titre d\'une section', keywords: 'h2 titre' },
            { type: 'text', label: 'Paragraphe', icon: 'align-left', element: 'p', description: 'Un bloc de texte', keywords: 'texte p' },
            { type: 'text', label: 'Petit texte', icon: 'type', element: 'span', description: 'Une légende, une étiquette', keywords: 'span label' },
            { type: 'text', label: 'Lien', icon: 'link', element: 'a', description: 'Un texte cliquable vers une adresse', keywords: 'url href' },
        ]
    },
    {
        name: 'Mise en page',
        items: [
            { type: 'container', label: 'Section', icon: 'layout-template', element: 'section', description: 'Une grande zone de la page, avec de l\'espace autour', keywords: 'bloc zone' },
            { type: 'container', label: 'Boîte', icon: 'box', element: 'div', description: 'Un cadre pour regrouper des éléments', keywords: 'conteneur div carte' },
            { type: 'container', label: 'Colonnes', icon: 'columns-2', element: 'grid', description: 'Place les éléments côte à côte en colonnes', keywords: 'grille grid row' },
            { type: 'container', label: 'Barre horizontale', icon: 'menu', element: 'nav', description: 'Aligne les éléments sur une ligne', keywords: 'nav navigation ligne' }
        ]
    },
    {
        name: 'Médias',
        items: [
            { type: 'media', label: 'Image', icon: 'image', element: 'img', description: 'Une photo ou une illustration', keywords: 'photo picture' },
            { type: 'media', label: 'Vidéo', icon: 'video', element: 'video', description: 'Une vidéo à lire sur la page', keywords: 'film' },
            { type: 'media', label: 'Icône', icon: 'smile', element: 'lucide-icon', description: 'Un petit pictogramme', keywords: 'icon picto' },
        ]
    },
    {
        name: 'Boutons & formulaires',
        items: [
            { type: 'action', label: 'Bouton', icon: 'mouse-pointer-2', element: 'button', description: 'Un bouton qui attire l\'œil', keywords: 'cta action' },
            { type: 'input', label: 'Champ texte', icon: 'text-cursor-input', element: 'input', description: 'Une ligne à remplir (nom, e-mail...)', keywords: 'input formulaire' },
            { type: 'input', label: 'Zone de texte', icon: 'file-text', element: 'textarea', description: 'Un grand champ pour un message', keywords: 'textarea message' },
            { type: 'input', label: 'Case à cocher', icon: 'check-square', element: 'checkbox', description: 'Une case à cocher avec son texte', keywords: 'checkbox accepter' },
        ]
    }
];
