import React, { useState, useRef } from 'react';
import styled, { css } from 'styled-components';
import {
  DragDropContext,
  Droppable,
  Draggable,
  OnDragEndOptions,
  OnDragOverOptions,
  reorder,
  move,
} from 'react-drag-on';

import { groupBy, flatten } from './utils';

let nextID = 0;

const createItems = (count: number, groupID: string) =>
  Array(count)
    .fill(null)
    .map(() => ({
      ID: ++nextID,
      groupID,
      text: `item ${nextID}`,
    }));

const DndExampleApp: React.FC = () => {
  const [columns, setColumns] = useState(['column-1', 'column-2', 'column-3', 'column-4']);
  const [items, setItems] = useState([...flatten(columns.map(x => createItems(5, x)))]);
  const grouppedItems = groupBy(items, x => x.groupID);
  const prevNearestNode = useRef<HTMLElement>(null);

  const handleDragEnd = (options: OnDragEndOptions) => {
    const { isMoving, droppableGroupID } = options;
    const map = {
      board: () => {
        const newColumns = reorder({
          ...options,
          items: columns,
          getDraggableID: x => x,
          getDroppableID: x => 'columns',
        });

        setColumns(newColumns);
      },
      columns: () => {
        if (isMoving) {
          const newItems = move({
            ...options,
            items,
            getDraggableID: x => x.ID,
            getDroppableID: x => x.groupID,
            setDroppableID: (x, droppableID) => {
              x.groupID = droppableID as string;
            },
          });

          setItems(newItems);
        } else {
          const newItems = reorder({
            ...options,
            items,
            getDraggableID: x => x.ID,
            getDroppableID: x => x.groupID,
          });

          setItems(newItems);
        }
      },
    };

    map[droppableGroupID]();

    if (prevNearestNode.current) {
      const node: HTMLElement = prevNearestNode.current.querySelector('[data-card]');

      node.style.removeProperty('background-color');
      prevNearestNode.current = null;
    }
  };

  const handleDragOver = ({ nearestNode, nearestNodeRect, targetRect }: OnDragOverOptions) => {
    // Выделяем ближайшего соседа цветом, если перетаскиваемый объект отклонился более чем на половину от целевого объекта
    // Может понадобится для перетаскивания элементов в дереве, чтобы дать пользователю понять вставится элемент как соседний или как потомок

    if (prevNearestNode.current && prevNearestNode.current !== nearestNode) {
      const node: HTMLElement = prevNearestNode.current.querySelector('[data-card]');

      node.style.removeProperty('background-color');
    }

    if (nearestNode) {
      const isOver = targetRect.left > nearestNodeRect.left + nearestNodeRect.width / 2;
      const node: HTMLElement = nearestNode.querySelector('[data-card]');

      if (isOver) {
        node.style.setProperty('background-color', '#8BC34A');
      } else {
        node.style.removeProperty('background-color');
      }
    }

    prevNearestNode.current = nearestNode;
  };

  return (
    <Root>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableID='columns' droppableGroupID='board' direction='horizontal'>
          {({ snapshot: columnsSnapshot, ...rest }) => {
            return (
              <DroppableBoardContent isDragging={columnsSnapshot.isDragging} {...rest}>
                {columns.map(groupKey => {
                  return (
                    <Draggable key={groupKey} draggableID={groupKey}>
                      {({
                        rootProps: columnsRootProps,
                        draggableProps: columnsDraggableProps,
                        snapshot: columnsSnapshot,
                      }) => {
                        return (
                          <Column {...columnsRootProps}>
                            <Droppable
                              droppableID={groupKey}
                              droppableGroupID='columns'
                              direction='vertical'
                              onDragOver={handleDragOver}>
                              {({ snapshot, ...rest }) => {
                                return (
                                  <>
                                    <DraggableColumnHeader
                                      isDragging={columnsSnapshot.isDragging}
                                      {...columnsDraggableProps}>
                                      {groupKey}
                                    </DraggableColumnHeader>
                                    <DroppableContent isDragging={snapshot.isDragging} {...rest}>
                                      {(grouppedItems[groupKey] || []).map(x => {
                                        return (
                                          <Draggable key={x.ID} draggableID={x.ID}>
                                            {({ rootProps, draggableProps, snapshot }) => {
                                              return (
                                                <DraggableContent isDragging={snapshot.isDragging} {...rootProps}>
                                                  <CardContentLayout data-card>
                                                    <DraggableHeader
                                                      isDragging={snapshot.isDragging}
                                                      {...draggableProps}
                                                    />
                                                    <CardContent>{x.text}</CardContent>
                                                  </CardContentLayout>
                                                </DraggableContent>
                                              );
                                            }}
                                          </Draggable>
                                        );
                                      })}
                                    </DroppableContent>
                                  </>
                                );
                              }}
                            </Droppable>
                          </Column>
                        );
                      }}
                    </Draggable>
                  );
                })}
              </DroppableBoardContent>
            );
          }}
        </Droppable>
      </DragDropContext>
    </Root>
  );
};

type SnapshotProps = {
  isDragging?: boolean;
};

const Root = styled.div`
  padding: 40px;
`;

const DroppableBoardContent = styled.div<SnapshotProps>`
  width: 100%;
  display: flex;
  flex-direction: row;
  border: 1px solid #ba68c8;
  overflow-anchor: none;
  transition: background-color 0.6s ease-in-out;
  padding: 10px;

  ${p =>
    p.isDragging &&
    css`
      background-color: #ce93d8;
    `};
`;

const Column = styled.div`
  flex: 1 1 25%;
  margin: 10px;
`;

const DraggableColumnHeader = styled.div<SnapshotProps>`
  width: 100%;
  height: 30px;
  background-color: #64b5f6;
  cursor: grab;
  user-select: none;
  color: #fff;
  padding: 8px;
  transition: background-color 0.6s ease-in-out;

  ${p =>
    p.isDragging &&
    css`
      background-color: black;
    `};
`;

const DroppableContent = styled.div<SnapshotProps>`
  display: flex;
  flex-direction: column;
  border: 1px solid #2196f3;
  overflow-anchor: none;
  transition: background-color 0.6s ease-in-out;
  padding: 10px;
  background-color: #fff;
  min-height: 156px;

  ${p =>
    p.isDragging &&
    css`
      background-color: #f3d264;
    `};
`;

const DraggableHeader = styled.div<SnapshotProps>`
  width: 100%;
  height: 32px;
  background-color: grey;
  cursor: grab;
  user-select: none;
  transition: background-color 0.2s ease-in-out;

  ${p =>
    p.isDragging &&
    css`
      background-color: black;
    `};
`;

const DraggableContent = styled.div<SnapshotProps>`
  border: 1px solid black;
  margin: 8px;
  transition: box-shadow 0.2s ease-in-out;

  ${p =>
    p.isDragging &&
    css`
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23);
    `};
`;

const CardContentLayout = styled.div`
  background-color: #eee;
  padding: 10px;
  transition: background-color 0.2s ease-in-out;
`;

const CardContent = styled.div`
  height: 64px;
  background-color: pink;
  padding: 20px;
`;

export { DndExampleApp };
