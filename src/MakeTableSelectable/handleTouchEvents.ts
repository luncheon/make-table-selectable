import type { GridArea, GridCell, GridContext, GridSelection } from "./types.js";
import { areasEqual, enclosingArea, handleDrag, isTouchEvent, rc } from "./util.js";

const touchHandleContainerStyles: Partial<CSSStyleDeclaration> = {
  position: "absolute",
  inset: "0",
  width: "100%",
  height: "100%",
  touchAction: "none",
  fill: "transparent",
  pointerEvents: "fill",
};

export const handleTouchEvents = (signal: AbortSignal, context: GridContext, setSelection: (selection: GridSelection) => void) => {
  let selection: GridSelection | undefined;
  const touchHandleContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.assign(touchHandleContainer.style, touchHandleContainerStyles);
  touchHandleContainer.innerHTML = "<circle r=12 /><circle r=12 />";
  const [tlHandle, brHandle] = touchHandleContainer.children as HTMLCollectionOf<SVGCircleElement> & [SVGCircleElement, SVGCircleElement];
  const hideTouchHandle = () => touchHandleContainer.remove();
  const _setSelection = (area: GridArea, activeCell?: GridCell) => {
    setSelection((selection = { areas: [area], activeCell: activeCell ?? rc(area.r0, area.c0), touchMode: true }));
    const rect = context.getAreaRect(area);
    tlHandle.cx.baseVal.value = rect.x;
    tlHandle.cy.baseVal.value = rect.y;
    brHandle.cx.baseVal.value = rect.x + rect.w;
    brHandle.cy.baseVal.value = rect.y + rect.h;
  };

  signal.addEventListener("abort", hideTouchHandle, { once: true });

  addEventListener("keydown", ({ key }) => key !== "Control" && key !== "Meta" && key !== "Alt" && key !== "Shift" && hideTouchHandle(), {
    signal,
  });

  context.rootElement.addEventListener("pointerdown", e => isTouchEvent(e) || hideTouchHandle(), { signal });
  context.rootElement.addEventListener(
    "pointerup",
    e => {
      if (isTouchEvent(e)) {
        const area = context.getCellAreaFromPoint(e);
        if (area) {
          _setSelection(area);
          (e.currentTarget as Element).parentElement!.append(touchHandleContainer);
        }
      }
    },
    { signal },
  );
  touchHandleContainer.addEventListener("pointerdown", e => {
    if (selection && isTouchEvent(e)) {
      const activeCellArea = context.getCellArea(selection.activeCell.r, selection.activeCell.c);
      let previousPointedCellArea: GridArea | undefined;
      handleDrag(
        e => {
          const area = context.getCellAreaFromPoint(e);
          area &&
            !(previousPointedCellArea && areasEqual(area, previousPointedCellArea)) &&
            _setSelection(enclosingArea(context, activeCellArea, (previousPointedCellArea = area)), selection!.activeCell);
        },
        () => _setSelection(selection!.areas[0]!),
      );
    } else {
      hideTouchHandle();
    }
  });
};
