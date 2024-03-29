import React, { useRef, useLayoutEffect, useEffect, memo, useMemo, createContext, useContext } from 'react';

import type { ID, Direction, Pointer, DraggableElement } from './types';
import { useDragDropContext, type DragDropContextValue } from './context';
import {
  CONTEXT_ID_ATTR,
  DROPPABLE_ID_ATTR,
  setStyles,
  removeStyles,
  getItemNodes,
  detectIsActiveDraggableNode,
  getActiveDraggableNode,
  getActiveDroppableNode,
  getScrollContainerFromContainer,
  safeNumber,
  getThreshold,
  debounce,
  createPointer,
} from './utils';

export type DroppableProps = {
  direction: Direction;
  droppableID: ID;
  droppableGroupID: ID;
  transitionTimeout?: number;
  transitionTimingFn?: string;
  disabled?: boolean;
  debounceTimeout?: number;
  children: (options: DroppableChildrenOptions) => React.ReactElement;
};

const Droppable: React.FC<DroppableProps> = props => {
  const { droppableID } = props;
  const dragDropContext = useDragDropContext();
  const { state } = dragDropContext;
  const { isDragging, activeDroppableID } = state;
  const isActive = droppableID === activeDroppableID;
  const updatingKey = `${isDragging}:${isActive}`;

  return <DroppableInner {...props} updatingKey={updatingKey} dragDropContext={dragDropContext} />;
};

type DroppableInnerProps = {
  updatingKey: string;
  dragDropContext: DragDropContextValue;
} & DroppableProps;

const DroppableInner: React.FC<DroppableInnerProps> = memo(
  props => {
    const {
      droppableID,
      droppableGroupID,
      direction,
      transitionTimeout,
      transitionTimingFn,
      debounceTimeout,
      disabled,
      dragDropContext,
      children,
    } = props;
    const { state, mergeState, resetState, onDragOver, onDragEnd } = dragDropContext;
    const {
      isDragging: isSomeDragging,
      contextID,
      nodeWidth,
      nodeHeight,
      activeDraggableID,
      activeDroppableID,
      activeDroppableGroupID,
      isIntersected,
      unsubscribers,
      onInsertPlaceholder,
    } = state;
    const isActiveGroup = !disabled && droppableGroupID === activeDroppableGroupID;
    const isActive = isActiveGroup && droppableID === activeDroppableID;
    const isDragging = isSomeDragging && isActive;
    const rootRef = useRef<DraggableElement>(null);
    const nearestNodeRef = useRef<DraggableElement>(null);
    const scope = useMemo<DroppableScope>(() => ({ removePlaceholder: () => {} }), []);
    const nodes = useMemo(() => (rootRef.current ? getItemNodes(contextID, droppableID) : []), [isDragging]);

    const handleDragEnd = (targetNode: DraggableElement) => {
      const sourceIdx = nodes.findIndex(x => detectIsActiveDraggableNode(x, activeDraggableID));
      const targetNodeRect = targetNode.getBoundingClientRect();
      const isMoving = sourceIdx === -1;
      let destinationIdx = 0;

      for (const node of nodes) {
        const nodeRect = node.getBoundingClientRect();
        const map: Record<DroppableProps['direction'], () => void> = {
          vertical: () => {
            if (safeNumber(targetNodeRect.top + targetNodeRect.height) > safeNumber(nodeRect.top + nodeRect.height)) {
              destinationIdx++;
            }
          },
          horizontal: () => {
            if (safeNumber(targetNodeRect.left + targetNodeRect.width) > safeNumber(nodeRect.left + nodeRect.width)) {
              destinationIdx++;
            }
          },
        };

        map[direction]();
      }

      setTimeout(() => {
        scope.removePlaceholder(true);
        nodes.forEach(x => removeStyles(x, ['transition', 'transform']));
        resetState();
      });

      onDragEnd({
        draggableID: activeDraggableID,
        droppableID,
        droppableGroupID,
        sourceIdx,
        destinationIdx,
        isMoving,
        targetNode,
      });
    };

    useBackwardTransitionEffect({
      isDragging,
      isIntersected,
      activeDraggableID,
      nodes,
      transitionTimeout,
    });

    useIntersectionEffect({
      contextID,
      activeDraggableID,
      activeDroppableID,
      isActiveGroup,
      isActive,
      isSomeDragging,
      debounceTimeout,
      rootNode: rootRef.current,
      unsubscribers,
      onIntersect: (targetNode, pointer) => {
        mergeState({
          activeDroppableID: droppableID,
          isIntersected: true,
          scrollContainer: getScrollContainerFromContainer(rootRef.current),
          onInsertPlaceholder: () => {
            transformNodesByTarget({
              direction,
              targetNode,
              nodeWidth,
              nodeHeight,
              pointer,
              activeDraggableID,
              transitionTimeout,
              transitionTimingFn,
              nodes: getItemNodes(contextID, droppableID),
              onMarkNearestNode: (nearestNode, targetNode) => {
                nearestNodeRef.current = nearestNode || null;
                onDragOver({
                  draggableID: activeDraggableID,
                  droppableID: activeDroppableID,
                  droppableGroupID: activeDroppableGroupID,
                  nearestNode,
                  targetNode,
                });
              },
            });
          },
        });
      },
    });

    usePlaceholderEffect({
      isDragging,
      nodeWidth,
      nodeHeight,
      container: rootRef.current,
      scope,
      isIntersected,
      transitionTimeout,
      transitionTimingFn,
      onInsertPlaceholder,
    });

    useDragMoveEffect({
      isDragging,
      unsubscribers,
      transformNodesByTargetOptions: {
        direction,
        nodes,
        activeDraggableID,
        nodeHeight,
        nodeWidth,
        transitionTimeout,
        transitionTimingFn,
        onMarkNearestNode: (nearestNode, targetNode) => {
          nearestNodeRef.current = nearestNode || null;
          onDragOver({
            draggableID: activeDraggableID,
            droppableID: activeDroppableID,
            droppableGroupID: activeDroppableGroupID,
            nearestNode,
            targetNode,
          });
        },
      },
    });

    useDragEndEffect({
      direction,
      isDragging,
      contextID,
      activeDraggableID,
      activeDroppableID,
      nearestNodeRef,
      transitionTimeout,
      transitionTimingFn,
      unsubscribers,
      onDragEnd: handleDragEnd,
    });

    const contextValue = useMemo<DroppableContextValue>(
      () => ({
        direction,
        droppableID,
        droppableGroupID,
        disabled,
      }),
      [direction, droppableID, droppableGroupID, disabled],
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
  },
  (prevProps, nextProps) => prevProps.updatingKey === nextProps.updatingKey,
);

Droppable.defaultProps = {
  transitionTimeout: 200,
  transitionTimingFn: 'ease-in-out',
  debounceTimeout: 0,
};

type DroppableScope = {
  removePlaceholder: (fromDragEnd?: boolean) => void;
};

type DroppableContextValue = {} & Pick<DroppableProps, 'direction' | 'droppableID' | 'droppableGroupID' | 'disabled'>;

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

type UseBackwardTransitionEffectOptions = {
  isDragging: boolean;
  isIntersected: boolean;
  activeDraggableID: ID;
  transitionTimeout: number;
  nodes: Array<DraggableElement>;
};

function useBackwardTransitionEffect(options: UseBackwardTransitionEffectOptions) {
  const { isDragging, isIntersected, activeDraggableID, transitionTimeout, nodes } = options;

  useEffect(() => {
    if (isDragging || !isIntersected || nodes.length === 0) return;

    for (const node of nodes) {
      if (detectIsActiveDraggableNode(node, activeDraggableID)) continue;

      setStyles(node, {
        transform: `translate3D(0, 0, 0)`,
      });

      setTimeout(() => {
        removeStyles(node, ['transition', 'transform']);
      }, transitionTimeout);
    }
  }, [isDragging]);
}

type UseIntersectionEffectOptions = {
  isSomeDragging: boolean;
  isActiveGroup: boolean;
  isActive: boolean;
  rootNode: DraggableElement;
  contextID: number;
  activeDroppableID: ID;
  activeDraggableID: ID;
  unsubscribers: Array<() => void>;
  onIntersect: (targetNode: DraggableElement, pointer: Pointer) => void;
} & Required<Pick<DroppableProps, 'debounceTimeout'>>;

function useIntersectionEffect(options: UseIntersectionEffectOptions) {
  const {
    isSomeDragging,
    isActiveGroup,
    isActive,
    rootNode,
    contextID,
    activeDroppableID,
    activeDraggableID,
    debounceTimeout,
    unsubscribers,
    onIntersect,
  } = options;

  useEffect(() => {
    if (!isSomeDragging) return;
    const handleDragMove = debounce((e: PointerEvent) => {
      if (e.target instanceof Document) return;
      if (!isSomeDragging) return;
      if (!isActiveGroup) return;
      if (isActive) return;
      const draggableNode = getActiveDraggableNode(contextID, activeDraggableID);
      const droppableRect = rootNode.getBoundingClientRect();
      const draggableRect = draggableNode.getBoundingClientRect();
      const draggableRectTop = safeNumber(draggableRect.top);
      const draggableRectLeft = safeNumber(draggableRect.left);
      const droppableRectTop = safeNumber(droppableRect.top);
      const droppableRectLeft = safeNumber(droppableRect.left);
      const droppableRectHeight = safeNumber(droppableRect.height);
      const droppableRectWidth = safeNumber(droppableRect.width);
      const isYaxesIntersected =
        draggableRectTop > droppableRectTop && draggableRectTop < droppableRectTop + droppableRectHeight;
      const isXaxesIntersected =
        draggableRectLeft > droppableRectLeft && draggableRectLeft < droppableRectLeft + droppableRectWidth;

      if (isYaxesIntersected && isXaxesIntersected) {
        const targetNode = e.target as DraggableElement;
        const pointer = createPointer(e);

        onIntersect(targetNode, pointer);
      }
    }, debounceTimeout);

    document.addEventListener('pointermove', handleDragMove);

    const unsubscribe = () => {
      document.removeEventListener('pointermove', handleDragMove);
    };

    unsubscribers.push(unsubscribe);

    return () => performUnsubscribers(unsubscribe, unsubscribers);
  }, [isSomeDragging, activeDroppableID, rootNode]);
}

type UsePlaceholderEffectOptions = {
  isDragging: boolean;
  nodeWidth: number;
  nodeHeight: number;
  container: DraggableElement;
  scope: DroppableScope;
  isIntersected: boolean;
  onInsertPlaceholder: () => void;
} & Required<Pick<DroppableProps, 'transitionTimeout' | 'transitionTimingFn'>>;

function usePlaceholderEffect(options: UsePlaceholderEffectOptions) {
  const {
    isDragging,
    nodeWidth,
    nodeHeight,
    container,
    scope,
    isIntersected,
    transitionTimeout,
    transitionTimingFn,
    onInsertPlaceholder,
  } = options;

  useLayoutEffect(() => {
    if (isDragging) {
      const placeholder = document.createElement('div');
      const inner = document.createElement('div');
      const transition = `max-width ${transitionTimeout}ms ${transitionTimingFn}, max-height ${transitionTimeout}ms ${transitionTimingFn}`;

      placeholder.appendChild(inner);
      container.appendChild(placeholder);

      setStyles(placeholder, {
        flex: `0 0 auto`,
      });

      if (isIntersected) {
        setStyles(placeholder, {
          maxWidth: 0,
          maxHeight: 0,
        });

        setStyles(inner, {
          width: `${nodeWidth}px`,
          height: `${nodeHeight}px`,
        });

        requestAnimationFrame(() => {
          setStyles(placeholder, {
            transition,
            maxWidth: `${nodeWidth}px`,
            maxHeight: `${nodeHeight}px`,
          });
        });
      } else {
        setStyles(placeholder, {
          width: `${nodeWidth}px`,
          height: `${nodeHeight}px`,
        });
      }

      scope.removePlaceholder = (fromDragEnd: boolean) => {
        if (fromDragEnd) {
          placeholder.parentElement.removeChild(placeholder);
        } else {
          setStyles(placeholder, {
            transition,
            maxWidth: `${nodeWidth}px`,
            maxHeight: `${nodeHeight}px`,
          });

          requestAnimationFrame(() => {
            setStyles(placeholder, {
              maxWidth: 0,
              maxHeight: 0,
            });

            setTimeout(() => {
              placeholder.parentElement.removeChild(placeholder);
            }, transitionTimeout);
          });
        }

        scope.removePlaceholder = () => {};
      };

      onInsertPlaceholder();
    }

    return () => scope.removePlaceholder();
  }, [isDragging]);
}

type UseDragMoveEffectOptions = {
  isDragging: boolean;
  unsubscribers: Array<() => void>;
  transformNodesByTargetOptions: Omit<TransformNodesByTargetOptions, 'targetNode' | 'pointer'>;
};

function useDragMoveEffect(options: UseDragMoveEffectOptions) {
  const { isDragging, unsubscribers, transformNodesByTargetOptions } = options;
  const scope = useMemo(() => ({ options: null }), []);

  scope.options = transformNodesByTargetOptions;

  useLayoutEffect(() => {
    if (!isDragging) return;

    const handleDragMove = debounce((e: PointerEvent) => {
      if (e.target instanceof Document) return;
      const targetNode = e.target as DraggableElement;
      const pointer = createPointer(e);

      transformNodesByTarget({ ...scope.options, targetNode, pointer });
    });

    document.addEventListener('pointermove', handleDragMove);

    const unsubscribe = () => {
      document.removeEventListener('pointermove', handleDragMove);
    };

    unsubscribers.push(unsubscribe);

    return () => performUnsubscribers(unsubscribe, unsubscribers);
  }, [isDragging]);
}

type UseDragEndEffectOptions = {
  direction: Direction;
  isDragging: boolean;
  contextID: number;
  activeDraggableID: ID;
  activeDroppableID: ID;
  nearestNodeRef: React.MutableRefObject<DraggableElement>;
  unsubscribers: Array<() => void>;
  onDragEnd: (node: DraggableElement) => void;
} & Required<Pick<DroppableProps, 'transitionTimeout' | 'transitionTimingFn'>>;

function useDragEndEffect(options: UseDragEndEffectOptions) {
  const {
    direction,
    isDragging,
    contextID,
    activeDraggableID,
    activeDroppableID,
    nearestNodeRef,
    transitionTimeout,
    transitionTimingFn,
    unsubscribers,
    onDragEnd,
  } = options;

  useLayoutEffect(() => {
    if (!isDragging) return;

    const handleDragEnd = () => {
      unsubscribers.forEach(fn => fn());
      unsubscribers.splice(0, unsubscribers.length);

      const nearestNode = nearestNodeRef.current || null;
      const hasTransform = nearestNode && window.getComputedStyle(nearestNode).transform !== 'none';

      const applyTransition = () => {
        const targetNode = getActiveDraggableNode(contextID, activeDraggableID);

        applyTargetNodeTransition({
          direction,
          contextID,
          activeDroppableID,
          targetNode,
          nearestNode,
          transitionTimeout,
          transitionTimingFn,
          onComplete: onDragEnd,
        });
      };

      if (nearestNode && hasTransform) {
        setTimeout(() => {
          applyTransition();
        }, transitionTimeout);
      } else {
        applyTransition();
      }
    };

    document.addEventListener('pointerup', handleDragEnd);

    const unsubscribe = () => {
      document.removeEventListener('pointerup', handleDragEnd);
    };

    unsubscribers.push(unsubscribe);

    return () => performUnsubscribers(unsubscribe, unsubscribers);
  }, [isDragging]);
}

type ApplyTargetNodeTransitionOptions = {
  direction: Direction;
  contextID: number;
  activeDroppableID: ID;
  targetNode: DraggableElement;
  nearestNode: DraggableElement | null;
  onComplete: (targetNode: DraggableElement) => void;
} & Required<Pick<DroppableProps, 'transitionTimeout' | 'transitionTimingFn'>>;

const applyTargetNodeTransition = (options: ApplyTargetNodeTransitionOptions) => {
  const {
    direction,
    contextID,
    activeDroppableID,
    targetNode,
    nearestNode,
    transitionTimeout,
    transitionTimingFn,
    onComplete,
  } = options;
  const targetNodeStyle = window.getComputedStyle(targetNode);
  const hasTransform = targetNodeStyle.transform !== 'none';
  const isVertical = direction === 'vertical';
  const { droppableTop, droppableLeft } = getDroppableContainerOffsets();

  function getDroppableContainerOffsets() {
    const droppableNode = getActiveDroppableNode(contextID, activeDroppableID);
    const { top, left } = droppableNode.getBoundingClientRect();
    const style = window.getComputedStyle(droppableNode);
    const paddingTop = parseInt(style.paddingTop, 10);
    const paddingLeft = parseInt(style.paddingLeft, 10);
    const droppableTop = safeNumber(top + paddingTop);
    const droppableLeft = safeNumber(left + paddingLeft);

    return { droppableTop, droppableLeft };
  }

  const getVerticalDirectionOffset = () => {
    if (nearestNode) {
      const { bottom } = nearestNode.getBoundingClientRect();
      const marginTop = parseInt(targetNodeStyle.marginTop, 10);

      return safeNumber(bottom + marginTop);
    }

    return droppableTop;
  };

  const getHorizontalDirectionOffset = () => {
    if (nearestNode) {
      const { left, width } = nearestNode.getBoundingClientRect();
      const marginLeft = parseInt(targetNodeStyle.marginLeft, 10);

      return safeNumber(left + width + marginLeft);
    }

    return droppableTop;
  };

  const offset = isVertical ? getVerticalDirectionOffset() : getHorizontalDirectionOffset();

  if (hasTransform) {
    const styles = {
      transition: `transform ${transitionTimeout}ms ${transitionTimingFn}, top ${transitionTimeout}ms ${transitionTimingFn}, left ${transitionTimeout}ms ${transitionTimingFn}`,
      transform: `translate3D(0, 0, 0)`,
      top: undefined,
      left: undefined,
    };

    if (isVertical) {
      styles.top = `${offset}px`;
      styles.left = `${droppableLeft}px`;
    } else {
      styles.top = `${droppableTop}px`;
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
  targetNode: DraggableElement;
  pointer: Pointer;
  nodes: Array<DraggableElement>;
  activeDraggableID: ID;
  nodeHeight: number;
  nodeWidth: number;
  onMarkNearestNode?: (nearestNode: DraggableElement, targetNode: DraggableElement) => void;
} & Pick<DroppableProps, 'transitionTimeout' | 'transitionTimingFn'>;

const transformNodesByTarget = (options: TransformNodesByTargetOptions) => {
  const {
    direction,
    targetNode,
    pointer,
    nodes,
    activeDraggableID,
    nodeHeight,
    nodeWidth,
    transitionTimeout = 0,
    transitionTimingFn = '',
    onMarkNearestNode = () => {},
  } = options;
  const targetRect = targetNode.getBoundingClientRect();
  let nearestNode: DraggableElement = null;
  let minimalDiff = Infinity;
  const fns: Array<() => void> = [];

  for (const node of nodes) {
    if (detectIsActiveDraggableNode(node, activeDraggableID)) continue;
    const rect = node.getBoundingClientRect();
    const top = safeNumber(rect.top);
    const left = safeNumber(rect.left);
    const { thresholdY, thresholdX } = getThreshold(targetRect, pointer);
    const map: Record<Direction, () => void> = {
      vertical: () => {
        if (thresholdY <= top || thresholdY - top === 1) {
          setStyles(node, {
            transition: `transform ${transitionTimeout}ms ${transitionTimingFn}`,
            transform: `translate3d(0px, ${nodeHeight}px, 0px)`,
          });
        } else {
          removeStyles(node, ['transform']);

          const diff = safeNumber(thresholdY - top);

          if (diff < minimalDiff) {
            minimalDiff = diff;
            nearestNode = node;
          }
        }
      },
      horizontal: () => {
        if (thresholdX <= left || thresholdX - left === 1) {
          setStyles(node, {
            transition: `transform ${transitionTimeout}ms ${transitionTimingFn}`,
            transform: `translate3d(${nodeWidth}px, 0px, 0px)`,
          });
        } else {
          removeStyles(node, ['transform']);

          const diff = safeNumber(thresholdX - left);

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

  onMarkNearestNode(nearestNode, targetNode);
};

function performUnsubscribers(unsubscribe: () => void, unsubscribers: Array<() => void>) {
  const idx = unsubscribers.findIndex(x => x === unsubscribe);

  if (idx !== -1) {
    unsubscribe();
    unsubscribers.splice(idx, 1);
  }
}

export { Droppable, useDroppableContext, transformNodesByTarget };
