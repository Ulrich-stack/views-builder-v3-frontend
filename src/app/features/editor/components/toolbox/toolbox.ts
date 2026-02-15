import { Component } from '@angular/core';
import { WIDGET_CATALOG } from '../../../../../core/data/toolbox.data';
import { CommonModule } from '@angular/common';
import { FileIcon, LucideAngularModule } from 'lucide-angular';

interface ToolboxCategory {
  name: string;
  items: { type: string; label: string; icon: string; element: string }[]
};

@Component({
  selector: 'app-toolbox',
  imports: [ CommonModule, LucideAngularModule],
  templateUrl: './toolbox.html',
  styleUrl: './toolbox.css',
})
export class Toolbox {
  readonly FileIcon = FileIcon;
  categories: ToolboxCategory[] = WIDGET_CATALOG;
}
