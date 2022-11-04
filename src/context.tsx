import React, { useReducer, createContext, useMemo, useContext, useEffect } from 'react';

import type { ID, DraggableElement } from './types';
import { GLOBAL_STYLE, DRAGGABLE_HANDLER_ATTR } from './utils';

export type DragDropContextProps = {
  onDragStart?: (options: OnDragStartOptions) => void;
  onDragOver?: (options: OnDragOverOptions) => void;
  onDragEnd: (options: OnDragEndOptions) => void;
  children: React.ReactElement;
};

const DragDropContext: React.FC<DragDropContextProps> = props => {
  const { children, onDragStart, onDragOver, onDragEnd } = props;
  const contextID = useMemo(() => getNextContextID(), []);
  const [state, dispatch] = useReducer(reducer, inititalState);
  const mergeState = (value: Partial<ContextState>) => dispatch({ value });
  const resetState = () => {
    state.onComplete();
    mergeState({
      isDragging: false,
      isIntersected: false,
      activeDroppableID: null,
      activeDraggableID: null,
      nodeWidth: null,
      nodeHeight: null,
      scrollContainer: null,
      unsubscribers: [],
      onComplete: null,
      onInsertPlaceholder: null,
    });
  };
  const value = useMemo<DragDropContextValue>(() => {
    state.contextID = contextID;

    return {
      state,
      mergeState,
      resetState,
      onDragStart,
      onDragOver,
      onDragEnd,
    };
  }, [state, onDragEnd]);

  useGlobalStyleEffect();

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

DragDropContext.defaultProps = {
  onDragStart: () => {},
  onDragOver: () => {},
};

function useGlobalStyleEffect() {
  useEffect(() => {
    const style = document.createElement('style');

    style.setAttribute(GLOBAL_STYLE, 'true');
    style.textContent = `
      [${DRAGGABLE_HANDLER_ATTR}] {
        touch-action: none;
      }
    `;

    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
}

export type DragDropContextValue = {
  state: ContextState;
  mergeState: (state: Partial<ContextState>) => void;
  resetState: () => void;
  onDragEnd: (options: OnDragEndOptions) => void;
} & Required<Pick<DragDropContextProps, 'onDragStart' | 'onDragOver' | 'onDragEnd'>>;

type ContextState = {
  isDragging: boolean;
  isIntersected: boolean;
  contextID: number;
  activeDroppableID: ID;
  activeDroppableGroupID: ID;
  activeDraggableID: ID;
  nodeWidth: number;
  nodeHeight: number;
  scrollContainer: DraggableElement;
  unsubscribers: Array<() => void>;
  onComplete: () => void;
  onInsertPlaceholder: () => void;
};

const Context = createContext<DragDropContextValue>(null);

const inititalState: ContextState = {
  isDragging: false,
  isIntersected: false,
  contextID: null,
  activeDroppableID: null,
  activeDroppableGroupID: null,
  activeDraggableID: null,
  nodeWidth: null,
  nodeHeight: null,
  scrollContainer: null,
  unsubscribers: [],
  onComplete: null,
  onInsertPlaceholder: null,
};

let nextContextID = 0;

function getNextContextID() {
  return ++nextContextID;
}

function reducer(state: ContextState, action: { value: Partial<ContextState> }) {
  return {
    ...state,
    ...action.value,
  };
}

function useDragDropContext() {
  const value = useContext(Context);

  return value;
}

type CallbackShared = {
  draggableID: ID;
  droppableID: ID;
  droppableGroupID: ID;
  targetNode: DraggableElement;
};

export type OnDragStartOptions = {} & CallbackShared;

export type OnDragOverOptions = {
  nearestNode: DraggableElement | null;
} & CallbackShared;

export type OnDragEndOptions = {
  sourceIdx: number;
  destinationIdx: number;
  isMoving: boolean;
} & CallbackShared;

export { DragDropContext, useDragDropContext };
