import type { ID, Pointer, DraggableElement } from './types';

const CONTEXT_ID_ATTR = 'data-dnd-context-id';
const DROPPABLE_ID_ATTR = 'data-dnd-droppable-id';
const DRAGGABLE_ID_ATTR = 'data-dnd-draggable-id';
const DRAGGABLE_HANDLER_ATTR = 'data-dnd-draggable-handler';
const GLOBAL_STYLE = 'data-dnd-global-style';

function setStyles(node: DraggableElement, style: Record<string, string | number>) {
  const namesMap = {
    maxWidth: 'max-width',
    maxHeight: 'max-height',
    zIndex: 'z-index',
    transformOrigin: 'transform-origin',
  };
  const keys = Object.keys(style);

  for (const key of keys) {
    const propertyName = namesMap[key] || key;
    const value = `${style[key]}`;

    node.style.setProperty(propertyName, value);
  }
}

function removeStyles(node: DraggableElement, keys: Array<string>) {
  for (const key of keys) {
    if (node.style.getPropertyValue(key)) {
      node.style.removeProperty(key);
    }
  }

  removeStyleAttrIfEmpty(node);
}

function getItemNodes(contextID: ID, droppableID: ID): Array<DraggableElement> {
  return Array.from(
    document.querySelectorAll(
      `[${CONTEXT_ID_ATTR}="${contextID}"][${DROPPABLE_ID_ATTR}="${droppableID}"][${DRAGGABLE_ID_ATTR}]`,
    ),
  );
}

function detectIsActiveDraggableNode(node: DraggableElement, activeDraggableID: ID) {
  return node.getAttribute(DRAGGABLE_ID_ATTR) === `${activeDraggableID}`;
}

function getActiveDraggableNode(contextID: number, activeDraggableID: ID): DraggableElement {
  return document.querySelector(`[${CONTEXT_ID_ATTR}="${contextID}"][${DRAGGABLE_ID_ATTR}="${activeDraggableID}"]`);
}

function getActiveDroppableNode(contextID: number, activeDroppableID: ID): DraggableElement {
  return document.querySelector(`[${CONTEXT_ID_ATTR}="${contextID}"][${DROPPABLE_ID_ATTR}="${activeDroppableID}"]`);
}

function getScrollContainer(node: DraggableElement): DraggableElement {
  let style = getComputedStyle(node);
  const excludeStaticParent = style.position === 'absolute';
  const overflowRegex = /(auto|scroll)/;

  if (style.position === 'fixed') return document.body;

  for (let parent = node; (parent = parent.parentElement); ) {
    style = getComputedStyle(parent);

    if (excludeStaticParent && style.position === 'static') {
      continue;
    }

    if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) return parent;
  }

  return document.body;
}

function getScrollContainerFromContainer(node: DraggableElement): DraggableElement {
  const style = getComputedStyle(node);
  const overflowRegex = /(auto|scroll)/;

  if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) {
    return node;
  }

  return getScrollContainer(node);
}

function getNodeSize(node: DraggableElement, rect: DOMRect) {
  const style = window.getComputedStyle(node);
  const marginTop = parseInt(style.marginTop, 10);
  const marginBottom = parseInt(style.marginBottom, 10);
  const marginRight = parseInt(style.marginRight, 10);
  const marginLeft = parseInt(style.marginLeft, 10);
  const nodeWidth = safeNumber(rect.width + marginLeft + marginRight);
  const nodeHeight = safeNumber(rect.height + marginTop + marginBottom);

  return {
    nodeWidth,
    nodeHeight,
  };
}

function safeNumber(value: number, precision = 0) {
  return Number(value.toFixed(precision));
}

function getThreshold(rect: DOMRect, pointer: Pointer) {
  const { top, left } = rect;
  const thresholdY = top > 0 ? top : pointer.clientY < window.innerHeight / 2 ? 0 : window.innerHeight;
  const thresholdX = left > 0 ? left : pointer.clientX < window.innerWidth / 2 ? 0 : window.innerWidth;

  return {
    thresholdY: safeNumber(thresholdY),
    thresholdX: safeNumber(thresholdX),
  };
}

function removeStyleAttrIfEmpty(node: DraggableElement) {
  if (!node.getAttribute('style')) {
    node.removeAttribute('style');
  }
}

function createBooleanMap<T = any>(items: Array<T> = [], getID: (item: T) => number | string): Record<string, boolean> {
  return items.reduce((acc, x) => ((acc[getID(x)] = true), acc), {});
}

function debounce<T extends (...args) => void>(fn: T, timeout = 0): T {
  let timerID = null;
  const debounced: any = (...args) => {
    timerID && clearTimeout(timerID);
    timerID = setTimeout(() => {
      fn(...args);
    }, timeout);
  };

  return debounced;
}

function createPointer(e: PointerEvent): Pointer {
  return { clientX: e.clientX, clientY: e.clientY };
}

export {
  CONTEXT_ID_ATTR,
  DROPPABLE_ID_ATTR,
  DRAGGABLE_ID_ATTR,
  DRAGGABLE_HANDLER_ATTR,
  GLOBAL_STYLE,
  setStyles,
  removeStyles,
  getItemNodes,
  detectIsActiveDraggableNode,
  getActiveDraggableNode,
  getActiveDroppableNode,
  getScrollContainer,
  getScrollContainerFromContainer,
  getNodeSize,
  safeNumber,
  getThreshold,
  createBooleanMap,
  debounce,
  createPointer,
};
