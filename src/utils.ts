import { OnDragEndOptions } from './context';
import { ID } from './types';

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

type ReorderOptions<T> = {
  items: Array<T>;
  getDroppableID: (x: T) => ID;
  getDraggableID: (x: T) => ID;
} & OnDragEndOptions;

function reorder<T>(options: ReorderOptions<T>) {
  const { items, sourceIdx, destinationIdx, droppableID, getDroppableID, getDraggableID } = options;
  const droppableItems = items.filter(x => getDroppableID(x) === droppableID);
  const idsMap = createBooleanMap(droppableItems, x => getDraggableID(x));
  const [removed] = droppableItems.splice(sourceIdx, 1);

  droppableItems.splice(destinationIdx, 0, removed);

  const result = [...items.filter(x => !idsMap[getDraggableID(x)]), ...droppableItems];

  return result;
}

type MoveOptions<T> = {
  items: Array<T>;
  getDroppableID: (x: T) => ID;
  setDroppableID: (x: T, droppableID: ID) => void;
  getDraggableID: (x: T) => ID;
} & OnDragEndOptions;

function move<T>(options: MoveOptions<T>) {
  const { items, destinationIdx, droppableID, draggableID, getDroppableID, getDraggableID, setDroppableID } = options;
  const droppableItems = items.filter(x => getDroppableID(x) === droppableID);
  const idsMap = createBooleanMap(droppableItems, x => getDraggableID(x));
  const idx = items.findIndex(x => getDraggableID(x) === draggableID);
  const item = items[idx];

  setDroppableID(item, droppableID);
  items.splice(idx, 1);
  droppableItems.splice(destinationIdx, 0, item);

  const result = [...items.filter(x => !idsMap[getDraggableID(x)]), ...droppableItems];

  return result;
}

export { debounce, reorder, move };
