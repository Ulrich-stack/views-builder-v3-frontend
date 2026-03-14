import { Component } from '@angular/core';
import { ToolboxItem, WIDGET_CATALOG } from '../../../../../core/data/toolbox.data';
import { CommonModule } from '@angular/common';
import { FileIcon, LucideAngularModule } from 'lucide-angular';

interface ToolboxCategory {
  name: string;
  items: ToolboxItem[]
};

@Component({
  selector: 'app-toolbox',
  imports: [ CommonModule, LucideAngularModule],
  templateUrl: './toolbox.html',
  styleUrl: './toolbox.css',
})
export class Toolbox {
  categories: ToolboxCategory[] = WIDGET_CATALOG;

  onDragStart(event: DragEvent, item: ToolboxItem){
    event.dataTransfer?.setData('widget-item', JSON.stringify(item));

    if(event.dataTransfer){
      event.dataTransfer.effectAllowed = 'move'
    }    
  }
}
