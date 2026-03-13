import { Widget } from "./widget.model";

export interface Page {
  id: string;
  name: string;
  x: number;
  y: number;
  widgets: Widget[];
  isDesignSystem?: boolean
}