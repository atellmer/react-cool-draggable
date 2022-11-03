import React, { useRef, useMemo, useLayoutEffect, memo } from 'react';

import { useDragDropContext } from './context';
import { useDroppableContext, transformNodesByTarget } from './droppable';
import {
  CONTEXT_ID_ATTR,
  DROPPABLE_ID_ATTR,
  DRAGGABLE_ID_ATTR,
  setStyles,
  removeStyles,
  getScrollContainer,
  getNodeSize,
  blockScroll,
  getItemNodes,
  createPointer,
} from './utils';
import type { ID, Pointer, Coordinates } from './types';

export type DraggableProps = {
  draggableID: ID;
  children: (options: DraggableChildrenOptions) => React.ReactElement;
};

const Draggable: React.FC<DraggableProps> = memo(props => {
  const { draggableID, children } = props;
  const { state, mergeState } = useDragDropContext();
  const { droppableID, droppableGroupID, direction, disabled } = useDroppableContext();
  const { contextID, scrollContainer } = state;
  const rootRef = useRef<HTMLDivElement>(null);
  const isActive = state.isDragging && state.activeDraggableID === draggableID;
  const scope = useMemo<DraggableScope>(() => ({ removeSensor: null, scrollContainer: null }), []);

  scope.scrollContainer = scrollContainer;

  useLayoutEffect(() => () => scope.removeSensor && scope.removeSensor(), []);

  const handleMouseDown = (startEvent: React.MouseEvent) => {
    if (disabled || startEvent.buttons !== 1 || state.onComplete) return;

    const targetNode = rootRef.current;
    const rect = targetNode.getBoundingClientRect();
    const scrollContainer = getScrollContainer(targetNode);
    const { nodeWidth, nodeHeight } = getNodeSize(targetNode, rect);
    const startPointer: Pointer = {
      clientX: startEvent.clientX,
      clientY: startEvent.clientY,
    };

    const handleMoveEvent = (moveEvent: MouseEvent) => {
      if (moveEvent.target instanceof Document) return;
      const movePointer = createPointer(moveEvent);

      applyMoveSensor({
        node: targetNode,
        scrollContainer: scope.scrollContainer,
        startPointer,
        movePointer,
      });
    };

    const removeSensor = () => {
      document.removeEventListener('mousemove', handleMoveEvent);
    };

    const handleComplete = () => removeNodeStyles(targetNode);

    const handleInsertPlaceholder = () => {
      transformNodesByTarget({
        direction,
        targetNode,
        nodeWidth,
        nodeHeight,
        pointer: startPointer,
        activeDraggableID: draggableID,
        nodes: getItemNodes(contextID, droppableID),
      });
    };

    setNodeDragStyles(targetNode, rect);
    mergeState({
      isDragging: true,
      activeDroppableID: droppableID,
      activeDroppableGroupID: droppableGroupID,
      activeDraggableID: draggableID,
      nodeWidth,
      nodeHeight,
      scrollContainer,
      unsubscribers: [removeSensor],
      onComplete: handleComplete,
      onInsertPlaceholder: handleInsertPlaceholder,
    });

    scope.removeSensor = () => {
      removeSensor();
      scope.removeSensor = null;
    };
    document.addEventListener('mousemove', handleMoveEvent);
  };

  const handleTouchStart = (startEvent: React.TouchEvent) => {
    if (disabled || state.onComplete) return;

    const targetNode = rootRef.current;
    const rect = targetNode.getBoundingClientRect();
    const scrollContainer = getScrollContainer(targetNode);
    const { nodeWidth, nodeHeight } = getNodeSize(targetNode, rect);
    const startPointer: Pointer = {
      clientX: startEvent.touches[0].clientX,
      clientY: startEvent.touches[0].clientY,
    };
    const unblockScroll = blockScroll(document.body);

    const handleEvent = (moveEvent: TouchEvent) => {
      if (moveEvent.target instanceof Document) return;
      const movePointer = createPointer(moveEvent);

      applyMoveSensor({
        node: targetNode,
        scrollContainer: scope.scrollContainer,
        startPointer,
        movePointer,
      });
    };

    const removeSensor = () => {
      document.removeEventListener('touchmove', handleEvent);
    };

    const handleComplete = () => {
      removeNodeStyles(targetNode);
      unblockScroll();
    };

    const handleInsertPlaceholder = () => {
      transformNodesByTarget({
        direction,
        targetNode,
        nodeWidth,
        nodeHeight,
        pointer: startPointer,
        activeDraggableID: draggableID,
        nodes: getItemNodes(contextID, droppableID),
      });
    };

    setNodeDragStyles(targetNode, rect);

    transformNodesByTarget({
      targetNode,
      direction,
      nodeWidth,
      nodeHeight,
      pointer: startPointer,
      activeDraggableID: draggableID,
      nodes: getItemNodes(contextID, droppableID),
    });

    mergeState({
      isDragging: true,
      activeDroppableID: droppableID,
      activeDroppableGroupID: droppableGroupID,
      activeDraggableID: draggableID,
      nodeWidth,
      nodeHeight,
      scrollContainer,
      unsubscribers: [removeSensor],
      onComplete: handleComplete,
      onInsertPlaceholder: handleInsertPlaceholder,
    });

    scope.removeSensor = () => {
      removeSensor();
      scope.removeSensor = null;
    };
    document.addEventListener('touchmove', handleEvent);
  };

  return children({
    rootProps: {
      ref: rootRef,
      draggable: false,
      [CONTEXT_ID_ATTR]: contextID,
      [DROPPABLE_ID_ATTR]: droppableID,
      [DRAGGABLE_ID_ATTR]: draggableID,
    },
    draggableProps: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
    },
    snapshot: {
      isDragging: isActive,
    },
  });
});

export type DraggableChildrenOptions = {
  rootProps: {
    ref: React.Ref<any>;
    draggable: false;
    [CONTEXT_ID_ATTR]: number;
    [DROPPABLE_ID_ATTR]: ID;
    [DRAGGABLE_ID_ATTR]: ID;
  };
  draggableProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
  snapshot: {
    isDragging: boolean;
  };
};

type DraggableScope = {
  removeSensor: () => void;
  scrollContainer: HTMLElement;
};

type ApplyMoveSensorOptions = {
  node: HTMLElement;
  startPointer: Pointer;
  movePointer: Pointer;
  scrollContainer: HTMLElement;
};

function applyMoveSensor(options: ApplyMoveSensorOptions) {
  const { node, startPointer, movePointer, scrollContainer } = options;
  const { x, y } = getCoordinates({ movePointer, startPointer });

  transformNodePosition(node, { x, y });

  requestAnimationFrame(() => {
    const isRoot = scrollContainer === document.body;
    const element = isRoot ? window : scrollContainer;
    const velocity = 1000;

    if (movePointer.clientY > window.innerHeight || movePointer.clientY < 0) {
      const shift = isRoot ? window.scrollY : scrollContainer.scrollTop;

      element.scroll({
        top: movePointer.clientY > 0 ? movePointer.clientY + shift : movePointer.clientY + shift - velocity,
        behavior: 'smooth',
      });
    }

    if (movePointer.clientX > window.innerWidth || movePointer.clientX < 0) {
      const shift = isRoot ? window.scrollX : scrollContainer.scrollLeft;

      element.scroll({
        left: movePointer.clientX > 0 ? movePointer.clientX + shift : movePointer.clientX + shift - velocity,
        behavior: 'smooth',
      });
    }
  });
}

type GetCoordinatesOptions = {
  movePointer: Pointer;
  startPointer: Pointer;
};

function getCoordinates(options: GetCoordinatesOptions): Coordinates {
  const { movePointer, startPointer } = options;
  const x = movePointer.clientX - startPointer.clientX;
  const y = movePointer.clientY - startPointer.clientY;

  return {
    x,
    y,
  };
}

function setNodeDragStyles(node: HTMLElement, rect: DOMRect) {
  const style = window.getComputedStyle(node);
  const marginTop = parseInt(style.marginTop);
  const marginLeft = parseInt(style.marginLeft);
  const top = rect.top - marginTop;
  const left = rect.left - marginLeft;

  setStyles(node, {
    position: 'fixed',
    zIndex: '100000',
    top: `${top}px`,
    left: `${left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    transformOrigin: '0 0',
    transition: 'none',
  });
}

function transformNodePosition(node: HTMLElement, { x, y }: Coordinates) {
  setStyles(node, {
    transform: `translate3D(${x}px, ${y}px, 0px)`,
  });
}

function removeNodeStyles(node: HTMLElement) {
  removeStyles(node, [
    'position',
    'top',
    'left',
    'z-index',
    'width',
    'height',
    'transform',
    'transition',
    'transform-origin',
  ]);
}

export { Draggable };