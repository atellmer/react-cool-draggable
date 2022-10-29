# react-drag-on 🐉

Drag-n-drop react library for horizontal and vertical lists.

- Easy to use 👨‍🎓
- Small size (5 kb gzipped) 💪
- 60 FPS performance 🚀
- Animated transitions 🎢
- Сustomizable appearance 💅
- Touch devices support 📱

One common frontend task is to create draggable cards in various lists. To simplify this task, I wrote a library that can work with horizontal and vertical lists, as well as their combinations (for example, as done in Trello).

## Simple horizontal list

```tsx
import {
  type OnDragEndOptions,
  DragDropContext,
  Droppable,
  Draggable,
  reorder,
} from 'react-drag-on';

const handleDragEnd = (options: OnDragEndOptions) => {
  const newItems = reorder({
    ...options,
    items,
    getDraggableID: x => x.ID,
    getDroppableID: () => 'board',
  });

  setItems(newItems);
};

<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable
    droppableID='board'
    droppableGroupID='board'
    direction='horizontal'>
    {({ snapshot, ...rest }) => {
      const className = `droppable-content ${snapshot.isDragging ? 'is-droppable-dragging' : ''}`;

      return (
        <div className={className} {...rest}>
          {items.map(x => {
            return (
              <Draggable key={x.ID} draggableID={x.ID}>
                {({ rootProps, draggableProps, snapshot }) => {
                  const className = `draggable-content ${snapshot.isDragging ? 'is-draggable-dragging' : ''}`;

                  return (
                    <div className={className} {...rootProps}>
                      <div className='card'>
                        <div className='card-header' {...draggableProps} />
                        <div className='card-content'>{x.text}</div>
                      </div>
                    </div>
                  );
                }}
              </Draggable>
            );
          })}
        </div>
      );
    }}
  </Droppable>
</DragDropContext>
```
