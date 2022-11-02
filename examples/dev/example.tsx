import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { DragDropContext, Droppable, Draggable, OnDragEndOptions, reorder } from 'react-drag-on';

let nextID = -1;

const createItems = (count: number) =>
  Array(count)
    .fill(null)
    .map(() => ({
      ID: ++nextID,
      text: `item ${nextID}`,
    }));

const DndExampleApp: React.FC = () => {
  const [items, setItems] = useState(createItems(10));

  const handleDragEnd = (options: OnDragEndOptions) => {
    const newItems = reorder({
      ...options,
      items,
      getDraggableID: x => x.ID,
      getDroppableID: () => 'board',
    });

    setItems(newItems);
  };

  return (
    <Root>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable direction='vertical' droppableID='board' droppableGroupID='root' transitionTimeout={200}>
          {({ snapshot, ...rest }) => {
            return (
              <DroppableContent isDragging={snapshot.isDragging} {...rest}>
                {items.map(x => {
                  return (
                    <Draggable key={x.ID} draggableID={x.ID}>
                      {({ rootProps, draggableProps, snapshot }) => {
                        return (
                          <DraggableContent isDragging={snapshot.isDragging} {...rootProps}>
                            <CardContentLayout data-card>
                              <DraggableHeader isDragging={snapshot.isDragging} {...draggableProps} />
                              <CardContent>{x.text}</CardContent>
                            </CardContentLayout>
                          </DraggableContent>
                        );
                      }}
                    </Draggable>
                  );
                })}
              </DroppableContent>
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

const DroppableContent = styled.div<SnapshotProps>`
  display: flex;
  flex-flow: column nowrap;
  border: 1px solid #2196f3;
  overflow-anchor: none;
  transition: background-color 0.6s ease-in-out;
  padding: 10px;
  background-color: #fff;
  min-height: 156px;
  //overflow-x: auto;

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
  width: 100%;
  height: 48px;
  background-color: pink;
  padding: 10px;
`;

export { DndExampleApp };
