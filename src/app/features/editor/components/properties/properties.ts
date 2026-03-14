import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../../../../core/services/EditorService/editor-service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './properties.html',
  styleUrl: './properties.css'
})
export class Properties {
  editor = inject(EditorService);

  updateStyle(property: string, value: string) {
    const widget = this.editor.selectedWidget();
    if (!widget) return;
    widget.styles = { ...widget.styles, [property]: value };
  }

  updateContent(value: string) {
    const widget = this.editor.selectedWidget();
    if (!widget) return;
    widget.content = value;
  }

  getCleanValue(val: string | undefined): string {
    if (!val) return '';
    if (val.startsWith('var(--')) return val.replace('var(--', '').replace(')', '');
    return val;
  }

  resolveColor(styleValue: string | undefined): string {
    if (!styleValue) return '#transparent';
    if (styleValue.startsWith('#')) return styleValue;

    const ds = this.editor.designSystem().colors;
    if (styleValue.includes('--primary')) return ds.primary;
    if (styleValue.includes('--secondary')) return ds.secondary;
    if (styleValue.includes('--surface')) return ds.surface;
    if (styleValue.includes('--text')) return ds.text;
    if (styleValue.includes('--bg-page')) return ds.bg;
    
    return '#000000';
  }

resetStyles() {
  const widget = this.editor.selectedWidget();
  if (!widget) return;

    const layoutProps = [
      'display', 'grid-template-columns', 'grid-auto-rows', 
      'grid-column', 'grid-row', 'flex-direction', 'gap', 
      'width', 'height'
    ];

    const safeStyles: Record<string, string> = {};

    layoutProps.forEach(prop => {
      if (widget.styles[prop]) {
        safeStyles[prop] = widget.styles[prop];
      }
    });

    widget.styles = safeStyles;
}

  isLinked(val: string | undefined): boolean {
    return !!val && val.startsWith('var(--');
  }
}