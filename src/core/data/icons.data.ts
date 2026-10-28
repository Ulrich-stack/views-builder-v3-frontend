import {
  LucideIconData,
  Leaf, Coffee, Utensils, CakeSlice, Croissant, Wine, Salad, ChefHat, Flower2, Sprout, Sun, Moon, Flame, Droplets, Waves, Wind, Mountain, Heart, HandHeart, HeartHandshake, Smile, Star, Sparkles, Award, ShieldCheck, Check, Lock, Key, Scale, Gavel, Landmark, Briefcase, FileText, Handshake, Users, Baby, PawPrint, Stethoscope, Dumbbell, Activity, Timer, Clock, Calendar, MapPin, Phone, Mail, Globe, Wifi, House, Car, Bike, Truck, Gift, ShoppingBag, Scissors, Camera, Music, Palette, Wrench, Hammer, BookOpen, GraduationCap, Zap, Quote
} from 'lucide-angular';

/**
 * Icônes disponibles pour le bloc « Icône » (Lucide, trait fin) : la même liste sert à l'éditeur,
 * à l'export HTML et au catalogue des sections générées par l'IA.
 */
export const ICONS: Record<string, LucideIconData> = {
  'leaf': Leaf,
  'coffee': Coffee,
  'utensils': Utensils,
  'cake-slice': CakeSlice,
  'croissant': Croissant,
  'wine': Wine,
  'salad': Salad,
  'chef-hat': ChefHat,
  'flower-2': Flower2,
  'sprout': Sprout,
  'sun': Sun,
  'moon': Moon,
  'flame': Flame,
  'droplets': Droplets,
  'waves': Waves,
  'wind': Wind,
  'mountain': Mountain,
  'heart': Heart,
  'hand-heart': HandHeart,
  'heart-handshake': HeartHandshake,
  'smile': Smile,
  'star': Star,
  'sparkles': Sparkles,
  'award': Award,
  'shield-check': ShieldCheck,
  'check': Check,
  'lock': Lock,
  'key': Key,
  'scale': Scale,
  'gavel': Gavel,
  'landmark': Landmark,
  'briefcase': Briefcase,
  'file-text': FileText,
  'handshake': Handshake,
  'users': Users,
  'baby': Baby,
  'paw-print': PawPrint,
  'stethoscope': Stethoscope,
  'dumbbell': Dumbbell,
  'activity': Activity,
  'timer': Timer,
  'clock': Clock,
  'calendar': Calendar,
  'map-pin': MapPin,
  'phone': Phone,
  'mail': Mail,
  'globe': Globe,
  'wifi': Wifi,
  'house': House,
  'car': Car,
  'bike': Bike,
  'truck': Truck,
  'gift': Gift,
  'shopping-bag': ShoppingBag,
  'scissors': Scissors,
  'camera': Camera,
  'music': Music,
  'palette': Palette,
  'wrench': Wrench,
  'hammer': Hammer,
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  'zap': Zap,
  'quote': Quote,
};

export const ICON_NAMES = Object.keys(ICONS);

/** Icône à afficher quand le nom est inconnu (ancienne page, faute de frappe de l'IA). */
export const FALLBACK_ICON = 'sparkles';

export function iconData(name: string | undefined): LucideIconData {
  return ICONS[name ?? ''] ?? ICONS[FALLBACK_ICON];
}

/** SVG autonome d'une icône, pour l'export : il prend la couleur du texte (currentColor). */
export function iconSvg(name: string | undefined, strokeWidth = 1.5): string {
  const escape = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const children = iconData(name)
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${escape(v)}"`).join(' ')}/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${children}</svg>`;
}
