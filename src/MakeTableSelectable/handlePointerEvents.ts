import type { GridContext, GridSelection } from "./types.js";
import { areaContainsCell, areasEqual, enclosingArea, handleDrag, isTouchEvent, rc } from "./util.js";

export const handlePointerEvents = (
  signal: AbortSignal,
  context: GridContext,
  getSelection: () => GridSelection | undefined,
  setSelection: (selection: GridSelection) => void,
) =>
  // todo: select entire row or column on pointer events on <th>
  context.rootElement.addEventListener(
    "pointerdown",
    e => {
      if (isTouchEvent(e)) {
        return;
      }
      let activeCellArea = context.getCellAreaFromPoint(e);
      let previousPointedCellArea = activeCellArea;
      if (!activeCellArea) {
        return;
      }
      e.button === 0 && e.preventDefault();
      let selection = getSelection();
      if (!selection || (e.ctrlKey || e.metaKey) === e.shiftKey) {
        selection = { areas: [activeCellArea], activeCell: rc(activeCellArea.r0, activeCellArea.c0) };
      } else if (e.shiftKey) {
        selection = {
          areas: [
            enclosingArea(context, activeCellArea, (activeCellArea = context.getCellArea(selection.activeCell.r, selection.activeCell.c))),
            ...selection.areas.slice(1),
          ],
          activeCell: selection.activeCell,
        };
      } else if (selection.areas.some(area => areaContainsCell(area, rc(activeCellArea!.r0, activeCellArea!.c0)))) {
        // todo: deselect and split areas
        return;
      } else {
        selection = { areas: [activeCellArea, ...selection.areas], activeCell: rc(activeCellArea.r0, activeCellArea.c0) };
      }
      setSelection(selection);
      handleDrag(e => {
        const area = context.getCellAreaFromPoint(e);
        area &&
          !areasEqual(area, previousPointedCellArea!) &&
          setSelection({
            areas: [enclosingArea(context, activeCellArea, (previousPointedCellArea = area)), ...selection.areas.slice(1)],
            activeCell: selection.activeCell,
          });
      });
    },
    { signal },
  );
