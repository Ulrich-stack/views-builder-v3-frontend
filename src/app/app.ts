import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toolbox } from "./features/editor/components/toolbox/toolbox";
import { Canvas } from "./features/editor/components/canvas/canvas";
import { Properties } from "./features/editor/components/properties/properties";

@Component({
  selector: 'app-root',
  imports: [Toolbox, Canvas, Properties],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('views-builder-v3-frontend');
}
