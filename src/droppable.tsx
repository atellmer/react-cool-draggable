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
  getClosestDroppableNode,
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
  const { droppableID, droppableGroupID, direction, transitionTimeout, children, onDragOver } = props;
  const { state, mergeState, resetState, onDragEnd } = useDragDropContext();
  const {
    isDragging: isSomeDragging,
    contextID,
    nodeWidth,
    nodeHeight,
    activeDraggableID,
    activeDroppableID,
    activeDroppableGroupID,
    unsubscribers,
    onInsertPlaceholder,
  } = state;
  const isActiveGroup = droppableGroupID === activeDroppableGroupID;
  const isActive = isActiveGroup && droppableID === activeDroppableID;
  const isDragging = isSomeDragging && isActive;
  const rootRef = useRef<HTMLElement>(null);
  const nearestNodeRef = useRef<HTMLElement>(null);
  const scope = useMemo<DroppableScope>(() => ({ removePlaceholder: () => {} }), []);
  const nodes = useMemo(() => (rootRef.current ? getItemNodes(contextID, droppableID) : []), [isDragging]);

  const handleDragEnd = (targetNode: HTMLElement) => {
    const sourceIdx = nodes.findIndex(x => detectIsActiveDraggableNode(x, activeDraggableID));
    const targetRect = targetNode.getBoundingClientRect();
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

    scope.removePlaceholder();
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

  useIntersectionEffect({
    contextID,
    activeDraggableID,
    activeDroppableID,
    isActiveGroup,
    isActive,
    isSomeDragging,
    rootNode: rootRef.current,
    unsubscribers,
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
    scope,
    onInsertPlaceholder,
  });

  useMoveSensorEffect({
    isDragging,
    unsubscribers,
    transformNodesByTargetOptions: {
      direction,
      nodes,
      activeDraggableID,
      nodeHeight,
      nodeWidth,
      transitionTimeout,
      onMarkNearestNode: (nearestNode, targetNode) => {
        nearestNodeRef.current = nearestNode || null;
        onDragOver({ nearestNode, targetNode });
      },
    },
  });

  useMoveEndSensorEffect({
    direction,
    isDragging,
    contextID,
    activeDraggableID,
    nearestNodeRef,
    transitionTimeout,
    unsubscribers,
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

Droppable.defaultProps = {
  transitionTimeout: 200,
  onDragOver: () => {},
};

type DroppableScope = {
  removePlaceholder: () => void;
};

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
  targetNode: HTMLElement;
};

type UseIntersectionEffectOptions = {
  isSomeDragging: boolean;
  isActiveGroup: boolean;
  isActive: boolean;
  rootNode: HTMLElement;
  contextID: number;
  activeDroppableID: ID;
  activeDraggableID: ID;
  unsubscribers: Array<() => void>;
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
    unsubscribers,
    onIntersect,
  } = options;

  useEffect(() => {
    if (!isSomeDragging) return;

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

    const unsubscribe = () => {
      document.removeEventListener('mousemove', handleEvent);
      document.removeEventListener('touchmove', handleEvent);
    };

    unsubscribers.push(unsubscribe);

    return () => unsubscribe();
  }, [isSomeDragging, activeDroppableID, rootNode]);
}

type UsePlaceholderEffectOptions = {
  isDragging: boolean;
  nodeWidth: number;
  nodeHeight: number;
  container: HTMLElement;
  scope: DroppableScope;
  onInsertPlaceholder: () => void;
};

function usePlaceholderEffect(options: UsePlaceholderEffectOptions) {
  const { isDragging, nodeWidth, nodeHeight, container, scope, onInsertPlaceholder } = options;

  useLayoutEffect(() => {
    let placeholder: HTMLDivElement = null;

    if (isDragging) {
      placeholder = document.createElement('div');

      scope.removePlaceholder = () => {
        placeholder.parentElement.removeChild(placeholder);
        scope.removePlaceholder = () => {};
      };

      setStyles(placeholder, {
        width: `${nodeWidth}px`,
        height: `${nodeHeight}px`,
        flex: `0 0 auto`,
      });

      container.appendChild(placeholder);
      onInsertPlaceholder();
    }
  }, [isDragging]);
}

type UseMoveSensorEffectOptions = {
  isDragging: boolean;
  unsubscribers: Array<() => void>;
  transformNodesByTargetOptions: Omit<TransformNodesByTargetOptions, 'target' | 'pointer'>;
};

function useMoveSensorEffect(options: UseMoveSensorEffectOptions) {
  const { isDragging, unsubscribers, transformNodesByTargetOptions } = options;

  useLayoutEffect(() => {
    if (!isDragging) return;

    const handleEvent = (e: MouseEvent | TouchEvent) => {
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
    };

    document.addEventListener('mousemove', handleEvent);
    document.addEventListener('touchmove', handleEvent);

    const unsubscribe = () => {
      document.removeEventListener('mousemove', handleEvent);
      document.removeEventListener('touchmove', handleEvent);
    };

    unsubscribers.push(unsubscribe);

    return () => unsubscribe();
  }, [isDragging]);
}

type UseMoveEndSensorEffectOptions = {
  direction: Direction;
  isDragging: boolean;
  contextID: number;
  activeDraggableID: ID;
  nearestNodeRef: React.MutableRefObject<HTMLElement>;
  transitionTimeout: number;
  unsubscribers: Array<() => void>;
  onDragEnd: (node: HTMLElement) => void;
};

function useMoveEndSensorEffect(options: UseMoveEndSensorEffectOptions) {
  const {
    direction,
    isDragging,
    contextID,
    activeDraggableID,
    nearestNodeRef,
    transitionTimeout,
    unsubscribers,
    onDragEnd,
  } = options;

  useLayoutEffect(() => {
    if (!isDragging) return;

    const handleEvent = () => {
      unsubscribers.forEach(fn => fn());
      unsubscribers.splice(0, unsubscribers.length);

      const nearestNode = nearestNodeRef.current || null;
      const hasTransform = nearestNode && window.getComputedStyle(nearestNode).transform !== 'none';

      const applyTransition = () => {
        const targetNode = getActiveDraggableNode(contextID, activeDraggableID);

        applyTargetNodeTransition({
          direction,
          targetNode,
          nearestNode,
          transitionTimeout,
          onComplete: onDragEnd,
        });
      };

      if (nearestNode && hasTransform) {
        const handleTransitionEnd = (e: globalThis.TransitionEvent) => {
          if (e.target === nearestNode && e.propertyName === 'transform') {
            nearestNode.removeEventListener('transitionend', handleTransitionEnd);
            applyTransition();
          }
        };

        nearestNode.addEventListener('transitionend', handleTransitionEnd);
      } else {
        applyTransition();
      }
    };

    document.addEventListener('mouseup', handleEvent);
    document.addEventListener('touchend', handleEvent);

    const unsubscribe = () => {
      document.removeEventListener('mouseup', handleEvent);
      document.removeEventListener('touchend', handleEvent);
    };

    unsubscribers.push(unsubscribe);

    return () => unsubscribe();
  }, [isDragging]);
}

type ApplyTargetNodeTransitionOptions = {
  direction: Direction;
  targetNode: HTMLElement;
  nearestNode: HTMLElement | null;
  transitionTimeout: number;
  onComplete: (targetNode: HTMLElement) => void;
};

const applyTargetNodeTransition = (options: ApplyTargetNodeTransitionOptions) => {
  const { direction, targetNode, nearestNode, transitionTimeout, onComplete } = options;
  const targetNodeStyle = window.getComputedStyle(targetNode);
  const hasTransform = targetNodeStyle.transform !== 'none';
  const isVertical = direction === 'vertical';

  const getDroppableContainerOffset = () => {
    const droppableNode = getClosestDroppableNode(targetNode);
    const { top } = droppableNode.getBoundingClientRect();
    const paddingTop = parseInt(window.getComputedStyle(droppableNode).paddingTop, 10);
    const offset = top + paddingTop;

    return offset;
  };

  const getVerticalDirectionOffset = () => {
    if (nearestNode) {
      const { bottom } = nearestNode.getBoundingClientRect();
      const marginTop = parseInt(targetNodeStyle.marginTop, 10);

      return bottom + marginTop;
    }

    return getDroppableContainerOffset();
  };

  const getHorizontalDirectionOffset = () => {
    if (nearestNode) {
      const { left, width } = nearestNode.getBoundingClientRect();
      const marginLeft = parseInt(targetNodeStyle.marginLeft, 10);

      return left + width + marginLeft;
    }

    return getDroppableContainerOffset();
  };

  const offset = isVertical ? getVerticalDirectionOffset() : getHorizontalDirectionOffset();

  if (hasTransform) {
    const styles = {
      transition: `transform ${transitionTimeout}ms ease-in-out, `,
      transform: `translate3D(0, 0, 0)`,
      top: undefined,
      left: undefined,
    };

    if (isVertical) {
      styles.transition += `top ${transitionTimeout}ms ease-in-out`;
      styles.top = `${offset}px`;
    } else {
      styles.transition += `left ${transitionTimeout}ms ease-in-out`;
      styles.left = `${offset}px`;
    }

    setStyles(targetNode, styles);

    setTimeout(() => {
      onComplete(targetNode);
    }, transitionTimeout);
  } else {
    onComplete(targetNode);
  }
};

type TransformNodesByTargetOptions = {
  direction: Direction;
  target: HTMLElement;
  pointer: Pointer;
  nodes: Array<HTMLElement>;
  activeDraggableID: ID;
  nodeHeight: number;
  nodeWidth: number;
  transitionTimeout: number;
  onMarkNearestNode?: (nearestNode: HTMLElement, targetNode: HTMLElement) => void;
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
          }
        }
      },
    };

    fns.push(map[direction]);
  }

  // read first getBoundingClientRect in loop, then change styles to improve performance
  fns.forEach(fn => fn());

  onMarkNearestNode(nearestNode, target);
};

export { Droppable, useDroppableContext, transformNodesByTarget };
