import type { GridArea, GridCell, GridContext, GridSelection } from "./types.js";

export const rc = (r: number, c: number) => ({ r, c });
export const tlbr = (r0: number, c0: number, r1: number, c1: number): GridArea => ({ r0, c0, r1, c1 });

export const singleCellSelection = (context: GridContext, activeCell: GridCell): GridSelection => ({
  areas: [context.getCellArea(activeCell.r, activeCell.c)],
  activeCell,
});

export const areasEqual = (a: GridArea, b: GridArea) => a === b || (a.r0 === b.r0 && a.r1 === b.r1 && a.c0 === b.c0 && a.c1 === b.c1);

export const areaContainsCell = (area: GridArea, { r, c }: GridCell) => r >= area.r0 && r <= area.r1 && c >= area.c0 && c <= area.c1;

export const isTouchEvent = (e: PointerEvent) => e.pointerType === "touch" || e.pointerType === "pen";

export const handleDrag = (onMove: (e: PointerEvent) => unknown, onEnd?: (e: PointerEvent) => unknown) => {
  const abortController = new AbortController();
  const abort = (e: PointerEvent) => {
    abortController.abort();
    onEnd?.(e);
  };
  const signal = abortController.signal;
  const listenerOptions = { signal, capture: true };
  addEventListener("pointerdown", abort, listenerOptions);
  addEventListener("pointerup", abort, listenerOptions);
  addEventListener("pointercancel", abort, listenerOptions);
  addEventListener("pointermove", onMove, listenerOptions);
};

type Writable<T> = { -readonly [K in keyof T]: T[K] };

const mergeArea = (a: Writable<GridArea>, b: GridArea): Writable<GridArea> => {
  a.r0 = Math.min(a.r0, b.r0);
  a.c0 = Math.min(a.c0, b.c0);
  a.r1 = Math.max(a.r1, b.r1);
  a.c1 = Math.max(a.c1, b.c1);
  return a;
};
export const normalizeExtendedArea = (context: GridContext, area: GridArea) => {
  const newArea = area;
  do {
    area = { ...newArea };
    for (let r = newArea.r0; r <= newArea.r1; r++) {
      mergeArea(newArea, context.getCellArea(r, area.c0));
      mergeArea(newArea, context.getCellArea(r, area.c1));
    }
    for (let c = newArea.c0; c <= newArea.c1; c++) {
      mergeArea(newArea, context.getCellArea(area.r0, c));
      mergeArea(newArea, context.getCellArea(area.r1, c));
    }
  } while (
    !areasEqual(area, newArea) &&
    newArea.r0 > 0 &&
    newArea.c0 > 0 &&
    newArea.r1 < context.rowCount - 1 &&
    newArea.c1 < context.columnCount - 1
  );
  return newArea;
};

export const enclosingArea = (context: GridContext, a: GridArea, b: GridArea): GridArea =>
  normalizeExtendedArea(context, tlbr(Math.min(a.r0, b.r0), Math.min(a.c0, b.c0), Math.max(a.r1, b.r1), Math.max(a.c1, b.c1)));
