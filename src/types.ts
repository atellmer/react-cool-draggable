export type ID = string | number;

export type Direction = 'vertical' | 'horizontal';

export type Pointer = {
  clientX: number;
  clientY: number;
};

export type Coordinates = {
  x: number;
  y: number;
};

export type DraggableElement = HTMLElement | SVGElement;
