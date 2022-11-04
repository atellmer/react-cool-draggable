import React, { useRef, useMemo, useLayoutEffect, memo } from 'react';

import type { ID, Pointer, Coordinates, DraggableElement } from './types';
import { useDragDropContext, type DragDropContextValue } from './context';
import { useDroppableContext, transformNodesByTarget } from './droppable';
import {
  CONTEXT_ID_ATTR,
  DROPPABLE_ID_ATTR,
  DRAGGABLE_ID_ATTR,
  DRAGGABLE_HANDLER_ATTR,
  setStyles,
  removeStyles,
  getScrollContainer,
  getNodeSize,
  getItemNodes,
  createPointer,
} from './utils';

export type DraggableProps = {
  draggableID: ID;
  children: (options: DraggableChildrenOptions) => React.ReactElement;
};

const Draggable: React.FC<DraggableProps> = props => {
  const { draggableID } = props;
  const dragDropContext = useDragDropContext();
  const { state } = dragDropContext;
  const { isDragging, activeDraggableID } = state;
  const isActive = draggableID === activeDraggableID;
  const updatingKey = `${isDragging}:${isActive}`;

  return <DraggableInner {...props} updatingKey={updatingKey} dragDropContext={dragDropContext} />;
};

type DraggableInnerProps = {
  updatingKey: string;
  dragDropContext: DragDropContextValue;
} & DraggableProps;

const DraggableInner: React.FC<DraggableInnerProps> = memo(
  props => {
    const { draggableID, dragDropContext, children } = props;
    const { state, mergeState, onDragStart } = dragDropContext;
    const { droppableID, droppableGroupID, direction, disabled } = useDroppableContext();
    const { contextID, scrollContainer } = state;
    const rootRef = useRef<DraggableElement>(null);
    const isActive = state.isDragging && state.activeDraggableID === draggableID;
    const scope = useMemo<DraggableScope>(() => ({ removeSensor: null, scrollContainer: null }), []);

    scope.scrollContainer = scrollContainer;

    useLayoutEffect(() => () => scope.removeSensor && scope.removeSensor(), []);

    const handleStartEvent = (startEvent: React.MouseEvent | React.TouchEvent) => {
      if (disabled || state.onComplete) return;
      const isMouseEvent = startEvent.nativeEvent instanceof MouseEvent;
      const mouseEvent = startEvent as React.MouseEvent;

      if (isMouseEvent && mouseEvent.buttons !== 1) return;

      const moveEventName = isMouseEvent ? 'mousemove' : 'touchmove';
      const targetNode = rootRef.current;
      const targetRect = targetNode.getBoundingClientRect();
      const scrollContainer = getScrollContainer(targetNode);
      const { nodeWidth, nodeHeight } = getNodeSize(targetNode, targetRect);
      const startPointer = createPointer(startEvent.nativeEvent);

      onDragStart({
        targetNode,
        draggableID,
        droppableID,
        droppableGroupID,
      });

      const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
        if (moveEvent.target instanceof Document) return;
        const movePointer = createPointer(moveEvent);

        syncMove({
          targetNode,
          startPointer,
          movePointer,
          scrollContainer: scope.scrollContainer,
        });
      };

      const removeSensor = () => {
        document.removeEventListener(moveEventName, handleDragMove);
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

      setNodeDragStyles(targetNode, targetRect);
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
      document.addEventListener(moveEventName, handleDragMove);
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
        [DRAGGABLE_HANDLER_ATTR]: true,
        onMouseDown: handleStartEvent,
        onTouchStart: handleStartEvent,
      },
      snapshot: {
        isDragging: isActive,
      },
    });
  },
  (prevProps, nextProps) => prevProps.updatingKey === nextProps.updatingKey,
);

export type DraggableChildrenOptions = {
  rootProps: {
    ref: React.Ref<any>;
    draggable: false;
    [CONTEXT_ID_ATTR]: number;
    [DROPPABLE_ID_ATTR]: ID;
    [DRAGGABLE_ID_ATTR]: ID;
  };
  draggableProps: {
    [DRAGGABLE_HANDLER_ATTR]: true;
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
  snapshot: {
    isDragging: boolean;
  };
};

type DraggableScope = {
  removeSensor: () => void;
  scrollContainer: DraggableElement;
};

type SyncMoveOptions = {
  targetNode: DraggableElement;
  startPointer: Pointer;
  movePointer: Pointer;
  scrollContainer: DraggableElement;
};

function syncMove(options: SyncMoveOptions) {
  const { targetNode, startPointer, movePointer, scrollContainer } = options;
  const { x, y } = getCoordinates({ movePointer, startPointer });

  transformNodePosition(targetNode, { x, y });
  requestAnimationFrame(() => {
    syncScroll({ movePointer, scrollContainer });
  });
}

type SyncScrollOptions = {
  movePointer: Pointer;
  scrollContainer: DraggableElement;
};

function syncScroll(options: SyncScrollOptions) {
  const { movePointer, scrollContainer } = options;
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

function setNodeDragStyles(node: DraggableElement, rect: DOMRect) {
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

function transformNodePosition(node: DraggableElement, { x, y }: Coordinates) {
  setStyles(node, {
    transform: `translate3D(${x}px, ${y}px, 0px)`,
  });
}

function removeNodeStyles(node: DraggableElement) {
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
