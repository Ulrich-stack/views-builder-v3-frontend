import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {
  LUCIDE_ICONS, LucideAngularModule, LucideIconProvider, LayoutTemplate, Box, Columns2, Menu, Type, AlignLeft,
  Image as ImageIcon, Smile, MousePointer2, PlusSquare,
  Search, Trash2, Settings, Heading1, Heading2,
  Link,
  Image,
  Video,
  TextCursorInput,
  FileText,
  ListOrdered,
  CheckSquare
} from 'lucide-angular';

const myIcons = {}

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      LucideAngularModule.pick({
        LayoutTemplate, Box, Columns2, Menu, Type, AlignLeft,
        ImageIcon, Smile, MousePointer2, PlusSquare,
        Search, Trash2, Settings, Heading1, Heading2, Link, Image, Video, TextCursorInput, FileText, ListOrdered, CheckSquare
      })
    ),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]
};
