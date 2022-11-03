import styled, { css } from 'styled-components';

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
  color: #fff;
  padding: 8px;

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
  min-height: 48px;
  background-color: pink;
  padding: 10px;
`;

export {
  Root,
  DroppableBoardContent,
  Column,
  DraggableColumnHeader,
  DroppableContent,
  DraggableHeader,
  DraggableContent,
  CardContentLayout,
  CardContent,
};
