import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndOptions, reorder, move } from 'react-drag-on';

import { groupBy, flatten } from '../../utils';
import {
  Root,
  DroppableBoardContent,
  Column,
  DraggableColumnHeader,
  DroppableContent,
  DraggableHeader,
  DraggableContent,
  CardContentLayout,
  CardContent,
} from './styled';

let nextID = 0;

const createItems = (count: number, groupID: string) =>
  Array(count)
    .fill(null)
    .map(() => ({
      ID: ++nextID,
      groupID,
      text: `item ${nextID}`,
    }));

const TrelloApp: React.FC = () => {
  const [columns, setColumns] = useState(['column-1', 'column-2', 'column-3', 'column-4']);
  const [items, setItems] = useState([...flatten(columns.map(x => createItems(5, x)))]);
  const groupedItems = groupBy(items, x => x.groupID);

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
                            <Droppable droppableID={groupKey} droppableGroupID='columns' direction='vertical'>
                              {({ snapshot, ...rest }) => {
                                return (
                                  <>
                                    <DraggableColumnHeader
                                      isDragging={columnsSnapshot.isDragging}
                                      {...columnsDraggableProps}>
                                      {groupKey} (draggable too)
                                    </DraggableColumnHeader>
                                    <DroppableContent isDragging={snapshot.isDragging} {...rest}>
                                      {(groupedItems[groupKey] || []).map(x => {
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

export { TrelloApp };
