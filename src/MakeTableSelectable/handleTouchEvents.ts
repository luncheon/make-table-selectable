import type { GridArea, GridCell, GridContext, GridSelection } from "./types.js";
import { areasEqual, enclosingArea, handleDrag, isTouchEvent, rc } from "./util.js";

export const handleTouchEvents = (
  signal: AbortSignal,
  context: GridContext,
  touchHandle: GlobalEventHandlers,
  setSelection: (selection: GridSelection) => void,
) => {
  let selection: GridSelection | undefined;
  const setSelectedArea = (area: GridArea, activeCell?: GridCell) =>
    setSelection((selection = { areas: [area], activeCell: activeCell ?? rc(area.r0, area.c0), touchMode: true }));

  context.rootElement.addEventListener(
    "pointerup",
    e => {
      if (isTouchEvent(e)) {
        const area = context.getCellAreaFromPoint(e);
        area && setSelectedArea(area);
      }
    },
    { signal },
  );

  touchHandle.addEventListener(
    "pointerdown",
    e => {
      if (selection && isTouchEvent(e)) {
        const activeCellArea = context.getCellArea(selection.activeCell.r, selection.activeCell.c);
        let previousPointedCellArea: GridArea | undefined;
        handleDrag(
          e => {
            const area = context.getCellAreaFromPoint(e, true);
            area &&
              !(previousPointedCellArea && areasEqual(area, previousPointedCellArea)) &&
              setSelectedArea(enclosingArea(context, activeCellArea, (previousPointedCellArea = area)), selection!.activeCell);
          },
          () => setSelectedArea(selection!.areas[0]!),
        );
      }
    },
    { signal },
  );
};
