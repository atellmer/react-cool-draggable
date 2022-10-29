import React, { useReducer, createContext, useMemo, useContext } from 'react';

import type { ID } from './types';

export type DragDropContextProps = {
  onDragEnd: (options: OnDragEndOptions) => void;
  children: React.ReactNode;
};

const DragDropContext: React.FC<DragDropContextProps> = props => {
  const { children, onDragEnd } = props;
  const contextID = useMemo(() => getNextContextID(), []);
  const [state, dispatch] = useReducer(reducer, inititalState);
  const mergeState = (value: Partial<ContextState>) => dispatch({ value });
  const resetState = () => {
    state.unsubscribers.forEach(fn => fn());
    mergeState({
      isDragging: false,
      activeDroppableID: null,
      activeDraggableID: null,
      nodeWidth: null,
      nodeHeight: null,
      scrollContainer: null,
      unsubscribers: [],
      onInsertPlaceholder: null,
    });
  };
  const value = useMemo(() => {
    state.contextID = contextID;

    return {
      state,
      mergeState,
      resetState,
      onDragEnd,
    };
  }, [state, onDragEnd]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export type DragDropContextValue = {
  state: ContextState;
  mergeState: (state: Partial<ContextState>) => void;
  resetState: () => void;
  onDragEnd: (options: OnDragEndOptions) => void;
};

type ContextState = {
  isDragging: boolean;
  contextID: number;
  activeDroppableID: ID;
  activeDroppableGroupID: ID;
  activeDraggableID: ID;
  nodeWidth: number;
  nodeHeight: number;
  scrollContainer: HTMLElement;
  unsubscribers: Array<() => void>;
  onInsertPlaceholder: () => void;
};

const Context = createContext<DragDropContextValue>(null);

const inititalState: ContextState = {
  isDragging: false,
  contextID: null,
  activeDroppableID: null,
  activeDroppableGroupID: null,
  activeDraggableID: null,
  nodeWidth: null,
  nodeHeight: null,
  scrollContainer: null,
  unsubscribers: [],
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

export type OnDragEndOptions = {
  draggableID: ID;
  droppableID: ID;
  droppableGroupID: ID;
  sourceIdx: number;
  destinationIdx: number;
  isMoving: boolean;
  targetRect: DOMRect;
};

export { DragDropContext, useDragDropContext };
