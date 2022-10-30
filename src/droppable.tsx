import React, { useRef, useLayoutEffect, useEffect, memo, useMemo, createContext, useContext } from 'react';

import { useDragDropContext } from './context';
import {
  CONTEXT_ID_ATTR,
  DROPPABLE_ID_ATTR,
  setStyles,
  removeStyles,
  getItemNodes,
  detectIsActiveDraggableNode,
  getActiveDraggableNode,
  getScrollContainerFromContainer,
  getThreshold,
  debounce,
} from './utils';
import type { ID, Direction, Pointer } from './types';

export type DroppableProps = {
  direction: Direction;
  droppableID: ID;
  droppableGroupID: ID;
  transitionTimeout?: number;
  children: (options: DroppableChildrenOptions) => React.ReactElement;
  onDragOver?: (options: OnDragOverOptions) => void;
};

const Droppable: React.FC<DroppableProps> = memo(props => {
  const { droppableID, droppableGroupID, direction, transitionTimeout = 200, children, onDragOver = () => {} } = props;
  const { state, mergeState, resetState, onDragEnd } = useDragDropContext();
  const {
    isDragging: isSomeDragging,
    contextID,
    nodeWidth,
    nodeHeight,
    activeDraggableID,
    activeDroppableID,
    activeDroppableGroupID,
    onInsertPlaceholder,
  } = state;
  const isActiveGroup = droppableGroupID === activeDroppableGroupID;
  const isActive = isActiveGroup && droppableID === activeDroppableID;
  const isDragging = isSomeDragging && isActive;
  const rootRef = useRef<HTMLElement>(null);
  const nodes = useMemo(() => (rootRef.current ? getItemNodes(contextID, droppableID) : []), [isDragging]);

  const handleDragEnd = () => {
    const sourceIdx = nodes.findIndex(x => detectIsActiveDraggableNode(x, activeDraggableID));
    const targetRect = getActiveDraggableNode(contextID, activeDraggableID).getBoundingClientRect();
    const isMoving = sourceIdx === -1;
    let destinationIdx = 0;

    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      const map: Record<DroppableProps['direction'], () => void> = {
        vertical: () => {
          if (targetRect.top + targetRect.height > rect.top + rect.height) {
            destinationIdx++;
          }
        },
        horizontal: () => {
          if (targetRect.left + targetRect.width > rect.left + rect.width) {
            destinationIdx++;
          }
        },
      };

      map[direction]();
    }

    // read first getBoundingClientRect, then change styles to improve performance
    nodes.forEach(x => removeStyles(x, ['transition', 'transform']));

    resetState();
    onDragEnd({
      draggableID: activeDraggableID,
      droppableID,
      droppableGroupID,
      sourceIdx,
      destinationIdx,
      isMoving,
      targetRect,
    });
  };

  useEffect(() => {
    if (isDragging) return;
    setTimeout(() => {
      nodes.forEach(x => {
        removeStyles(x, ['transition', 'transform']);
      });
    });
  }, [isDragging]);

  useIntersectionEffect({
    contextID,
    activeDraggableID,
    activeDroppableID,
    isActiveGroup,
    isActive,
    isSomeDragging,
    rootNode: rootRef.current,
    onIntersect: () => {
      mergeState({
        activeDroppableID: droppableID,
        scrollContainer: getScrollContainerFromContainer(rootRef.current),
        onInsertPlaceholder: () => {},
      });
    },
  });

  usePlaceholderEffect({
    isDragging,
    nodeWidth,
    nodeHeight,
    container: rootRef.current,
    onInsertPlaceholder,
  });

  useMoveSensorEffect({
    isDragging,
    transformNodesByTargetOptions: {
      direction,
      nodes,
      activeDraggableID,
      nodeHeight,
      nodeWidth,
      transitionTimeout,
      onMarkNearestNode: (nearestNode, nearestNodeRect, targetRect) => {
        onDragOver({ nearestNode, nearestNodeRect, targetRect });
      },
    },
  });

  useEndSensorEffect({
    isDragging,
    onDragEnd: handleDragEnd,
  });

  const contextValue = useMemo<DroppableContextValue>(
    () => ({
      direction,
      droppableID,
      droppableGroupID,
    }),
    [direction, droppableID, droppableGroupID],
  );

  return (
    <DroppableContext.Provider value={contextValue}>
      {children({
        ref: rootRef,
        [CONTEXT_ID_ATTR]: contextID,
        [DROPPABLE_ID_ATTR]: droppableID,
        snapshot: {
          isDragging,
        },
        onDragStart: defaultHandleDragStart,
      })}
    </DroppableContext.Provider>
  );
});

type DroppableContextValue = {} & Pick<DroppableProps, 'direction' | 'droppableID' | 'droppableGroupID'>;

const DroppableContext = createContext<DroppableContextValue>(null);

function useDroppableContext() {
  return useContext(DroppableContext);
}

const defaultHandleDragStart = (e: React.MouseEvent) => e.preventDefault();

export type DroppableChildrenOptions = {
  ref: React.Ref<any>;
  [CONTEXT_ID_ATTR]: number;
  [DROPPABLE_ID_ATTR]: ID;
  snapshot: {
    isDragging: boolean;
  };
  onDragStart: React.DragEventHandler;
};

export type OnDragOverOptions = {
  nearestNode: HTMLElement | null;
  nearestNodeRect: DOMRect;
  targetRect: DOMRect;
};

type UseIntersectionEffectOptions = {
  isSomeDragging: boolean;
  isActiveGroup: boolean;
  isActive: boolean;
  rootNode: HTMLElement;
  contextID: number;
  activeDroppableID: ID;
  activeDraggableID: ID;
  onIntersect: () => void;
};

function useIntersectionEffect(options: UseIntersectionEffectOptions) {
  const {
    isSomeDragging,
    isActiveGroup,
    isActive,
    rootNode,
    contextID,
    activeDroppableID,
    activeDraggableID,
    onIntersect,
  } = options;

  useEffect(() => {
    const handleEvent = () => {
      if (!isSomeDragging) return;
      if (!isActiveGroup) return;
      if (isActive) return;
      const droppableRect = rootNode.getBoundingClientRect();
      const draggingRect = getActiveDraggableNode(contextID, activeDraggableID).getBoundingClientRect();
      const isYaxesIntersected =
        draggingRect.top > droppableRect.top && draggingRect.top < droppableRect.top + droppableRect.height;
      const isXaxesIntersected =
        draggingRect.left > droppableRect.left && draggingRect.left < droppableRect.left + droppableRect.width;

      if (isYaxesIntersected && isXaxesIntersected) {
        onIntersect();
      }
    };

    document.addEventListener('mousemove', handleEvent);
    document.addEventListener('touchmove', handleEvent);

    return () => {
      document.removeEventListener('mousemove', handleEvent);
      document.removeEventListener('touchmove', handleEvent);
    };
  }, [isSomeDragging, activeDroppableID, rootNode]);
}

type UsePlaceholderEffectOptions = {
  isDragging: boolean;
  nodeWidth: number;
  nodeHeight: number;
  container: HTMLElement;
  onInsertPlaceholder: () => void;
};

function usePlaceholderEffect(options: UsePlaceholderEffectOptions) {
  const { isDragging, nodeWidth, nodeHeight, container, onInsertPlaceholder } = options;

  useLayoutEffect(() => {
    let placeholder = null;

    if (isDragging) {
      placeholder = document.createElement('div');

      setStyles(placeholder, {
        width: `${nodeWidth}px`,
        height: `${nodeHeight}px`,
        flex: `0 0 auto`,
      });

      container.appendChild(placeholder);
      onInsertPlaceholder();
    }

    return () => placeholder && container.removeChild(placeholder);
  }, [isDragging]);
}

type UseMoveSensorEffectOptions = {
  isDragging: boolean;
  transformNodesByTargetOptions: Omit<TransformNodesByTargetOptions, 'target' | 'pointer'>;
};

function useMoveSensorEffect(options: UseMoveSensorEffectOptions) {
  const { isDragging, transformNodesByTargetOptions } = options;

  useLayoutEffect(() => {
    if (!isDragging) return;

    const handleEvent = debounce((e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      const pointer: Pointer =
        e instanceof MouseEvent
          ? { clientX: e.clientX, clientY: e.clientY }
          : e instanceof TouchEvent
          ? { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }
          : null;

      transformNodesByTarget({
        ...transformNodesByTargetOptions,
        target,
        pointer,
      });
    });

    document.addEventListener('mousemove', handleEvent);
    document.addEventListener('touchmove', handleEvent);

    return () => {
      document.removeEventListener('mousemove', handleEvent);
      document.removeEventListener('touchmove', handleEvent);
    };
  }, [isDragging]);
}

type UseEndSensorEffectOptions = {
  isDragging: boolean;
  onDragEnd: () => void;
};

function useEndSensorEffect(options: UseEndSensorEffectOptions) {
  const { isDragging, onDragEnd } = options;

  useLayoutEffect(() => {
    if (!isDragging) return;

    const handleEvent = () => onDragEnd();

    document.addEventListener('mouseup', handleEvent);
    document.addEventListener('touchend', handleEvent);

    return () => {
      document.removeEventListener('mouseup', handleEvent);
      document.removeEventListener('touchend', handleEvent);
    };
  }, [isDragging]);
}

type TransformNodesByTargetOptions = {
  direction: Direction;
  target: HTMLElement;
  pointer: Pointer;
  nodes: Array<HTMLElement>;
  activeDraggableID: ID;
  nodeHeight: number;
  nodeWidth: number;
  transitionTimeout: number;
  onMarkNearestNode?: (node: HTMLElement, nodeRect: DOMRect, targetRect: DOMRect) => void;
};

const transformNodesByTarget = (options: TransformNodesByTargetOptions) => {
  const {
    direction,
    target,
    pointer,
    nodes,
    activeDraggableID,
    nodeHeight,
    nodeWidth,
    transitionTimeout,
    onMarkNearestNode = () => {},
  } = options;
  const targetRect = target.getBoundingClientRect();
  let nearestNode: HTMLElement = null;
  let nearestNodeRect: DOMRect = null;
  let minimalDiff = Infinity;
  const fns: Array<() => void> = [];

  for (const node of nodes) {
    if (detectIsActiveDraggableNode(node, activeDraggableID)) continue;

    const rect = node.getBoundingClientRect();
    const { thresholdY, thresholdX } = getThreshold(targetRect, pointer);
    const map: Record<Direction, () => void> = {
      vertical: () => {
        if (thresholdY <= rect.top) {
          setStyles(node, {
            transition: `transform ${transitionTimeout}ms ease-in-out`,
            transform: `translate3d(0px, ${nodeHeight}px, 0px)`,
          });
        } else {
          removeStyles(node, ['transform']);
          const diff = thresholdY - rect.top;

          if (diff < minimalDiff) {
            minimalDiff = diff;
            nearestNode = node;
            nearestNodeRect = rect;
          }
        }
      },
      horizontal: () => {
        if (thresholdX <= rect.left) {
          setStyles(node, {
            transition: `transform ${transitionTimeout}ms ease-in-out`,
            transform: `translate3d(${nodeWidth}px, 0px, 0px)`,
          });
        } else {
          removeStyles(node, ['transform']);
          const diff = thresholdX - rect.left;

          if (diff < minimalDiff) {
            minimalDiff = diff;
            nearestNode = node;
            nearestNodeRect = rect;
          }
        }
      },
    };

    fns.push(map[direction]);
  }

  // read first getBoundingClientRect, then change styles to improve performance
  fns.forEach(fn => fn());

  onMarkNearestNode(nearestNode, nearestNodeRect, targetRect);
};

export { Droppable, useDroppableContext, transformNodesByTarget };
