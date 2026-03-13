import { Widget } from "./widget.model";

export interface Page {
  id: string;
  name: string;
  x: number;
  y: number;
  width?: number; 
  height?: number;
  widgets: Widget[];
  isDesignSystem?: boolean
}