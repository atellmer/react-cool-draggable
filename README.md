# react-cool-draggable

Drag-n-drop react library (component) for horizontal and vertical lists.

- Easy to use 👨‍🎓
- Small size (6 kb gzipped) 💪
- 60 FPS performance 🚀
- Animated transitions 🎢
- Сustomizable appearance 💅
- Touch devices support 📱
- Any element sizes 📏
- No dependencies ✔️

One common frontend task is to create draggable cards in various lists. To simplify this task, I wrote a library that can work with horizontal and vertical lists, as well as their combinations (for example, as done in Trello).

## Demo

- [Trello app](https://atellmer.github.io/react-cool-draggable/examples/trello/)

## Installation
npm:
```
npm install react-cool-draggable
```
yarn:
```
yarn add react-cool-draggable
```

## Usage

```tsx
import {
  DragDropContext,
  Droppable,
  Draggable,
  reorder,
} from 'react-cool-draggable';

const handleDragEnd = options => {
  const newItems = reorder({
    ...options,
    items,
    getDraggableID: x => x.ID,
    getDroppableID: () => 'row',
  });

  setItems(newItems);
};

<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable
    direction='vertical'
    droppableID='row'
    droppableGroupID='board'>
    {({ snapshot, ...rest }) => (
      <div className='droppable' {...rest}>
        {items.map(x => (
          <Draggable key={x.ID} draggableID={x.ID}>
            {({ snapshot, rootProps, draggableProps }) => (
              <div className='draggable' {...rootProps} {...draggableProps}>
                {x.text}
              </div>
            )}
          </Draggable>
        ))}
      </div>
    )}
  </Droppable>
</DragDropContext>
```

You can also combine and nest draggable elements to create more complex components if you need to.

## API
### DragDropContext

This library uses the react context as a way to communicate between children in the tree, so the context must be explicitly invoked at the root of the component. The context has one callback onDragEnd that is called when the user drops the element.

```tsx
import { DragDropContext } from 'react-cool-draggable';
```

```tsx
<DragDropContext onDragEnd={handleDragEnd}>
  Some children here...
</DragDropContext>
```

```tsx
export type DragDropContextProps = {
  onDragEnd: (options: OnDragEndOptions) => void;
  children: React.ReactNode;
};
```

The onDragEnd callback accepts a number of options that may be useful to you later.

```tsx
type OnDragEndOptions = {
  draggableID: string | number;
  droppableID: string | number;
  droppableGroupID: string | number;
  sourceIdx: number;
  destinationIdx: number;
  isMoving: boolean;
  targetNode: HTMLElement;
};
```
### Droppable
Think of this component as a surface on which elements move. It is simple logic where all the logic is hidden. At the same time, it is based on the concept of RenderProps and expects to receive a render function as children.

```tsx
import { Droppable } from 'react-cool-draggable';
```

```tsx
<Droppable
  direction='vertical'
  droppableID='row'
  droppableGroupID='board'>
  {({ snapshot, ...rest }) => <div {...rest}>Some children here...</div>}
</Droppable>
```

```tsx
type DroppableProps = {
  direction: 'horizontal' | 'vertical';
  droppableID: string | number;
  droppableGroupID: string | number;
  transitionTimeout?: number;
  transitionTimingFn?: string;
  disabled?: boolean;
  debounceTimeout?: number;
  onDragOver?: (options: OnDragOverOptions) => void;
  children: (options: DroppableChildrenOptions) => React.ReactElement;
};
```

The direction - the main property that specifies how the component should deal with the drag direction. You will also need to provide some identifiers so that you can distinguish one surface from another.

```tsx
type DroppableChildrenOptions = {
  snapshot: {
    isDragging: boolean;
  };
  ...some service options 
};
```

The snapshot can be useful for you to understand and react to real-time dragging, such as changing the surface color to let the user know that the dragging mode has been activated.

```tsx
type OnDragOverOptions = {
  nearestNode: HTMLElement | null;
  targetNode: HTMLElement;
};
```

Also, in some cases you may want to track the progress of the move in the onDragOver callback.

### Draggable

You can think of this component as an element that is draggable by the user. And it is also just a component that implements logic without any external appearance. So he also needs a render function to tell him what he should look like.

```tsx
import { Draggable } from 'react-cool-draggable';
```

```tsx
<Draggable draggableID={x.ID}>
  {({ snapshot, rootProps, draggableProps }) =>
    <div {...rootProps} {...draggableProps}>Some children here...</div>}
</Draggable>
```

```tsx
type DraggableProps = {
  draggableID: string | number;
  children: (options: DraggableChildrenOptions) => React.ReactElement;
};
```

```tsx
type DraggableChildrenOptions = {
  snapshot: {
    isDragging: boolean;
  };
  rootProps: SomeServiceOptions;
  draggableProps: SomeServiceOptions;
};
```

In the render function declaration, you must pass rootProps and draggableProps to the element. At the same time, if you want to make the draggable activation not be carried out on the entire element, but only on its part (for example, a button that needs to be captured in order to drag), then you must pass draggableProps to this button and pass only rootProps to the element itself.

### reorder and move

```tsx
import { reorder, move } from 'react-cool-draggable';
```

These are the functions you need to apply inside the onDragEnd callback to sort the list of items in the component's state correctly. In this case, reorder does the usual sorting, and move - moving an element from one group to another, if you implement an exchange of elements between two or more droppable surfaces. This may sound complicated, but it isn't, so please see examples/trello for examples of how to use these functions.

```tsx
const newItems = reorder({
  ...options,
  items,
  getDraggableID: x => x.ID,
  getDroppableID: () => 'row',
});
```

```tsx
const newItems = move({
  ...options,
  items,
  getDraggableID: x => x.ID,
  getDroppableID: x => x.groupID,
  setDroppableID: (x, droppableID) => {
    x.groupID = droppableID;
  },
});
```

# LICENSE

MIT © [Alex Plex](https://github.com/atellmer)
