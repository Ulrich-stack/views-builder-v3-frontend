import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {
  LucideAngularModule,
  // Boîte à composants
  LayoutTemplate, Box, Columns2, Menu, Type, AlignLeft, Smile, MousePointer2, Heading1, Heading2, Link, Image,
  Video, TextCursorInput, FileText, CheckSquare, MonitorPlay, LayoutGrid, Tag, MessageSquare, Mail, Layers,
  PanelTop, PanelBottom, Images,
  // Interface
  Search, Trash2, Plus, X, MousePointerClick, ChevronDown, ChevronRight, ChevronUp, Palette, Maximize2,
  ArrowUp, ArrowDown, Copy, CornerLeftUp, Pencil, RotateCcw, Keyboard, Sparkles
} from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      LucideAngularModule.pick({
        LayoutTemplate, Box, Columns2, Menu, Type, AlignLeft, Smile, MousePointer2, Heading1, Heading2, Link, Image,
        Video, TextCursorInput, FileText, CheckSquare, MonitorPlay, LayoutGrid, Tag, MessageSquare, Mail, Layers,
        PanelTop, PanelBottom, Images,
        Search, Trash2, Plus, X, MousePointerClick, ChevronDown, ChevronRight, ChevronUp, Palette, Maximize2,
        ArrowUp, ArrowDown, Copy, CornerLeftUp, Pencil, RotateCcw, Keyboard, Sparkles
      })
    ),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]
};
