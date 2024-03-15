import type { GridArea, GridCell, GridContext, GridSelection } from "./types.js";
import { areasEqual, enclosingArea, handleDrag, rc } from "./util.js";

const touchHandleContainerStyles: Partial<CSSStyleDeclaration> = {
  position: "absolute",
  inset: "0",
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  touchAction: "none",
};

export const handleTouchEvents = (signal: AbortSignal, context: GridContext, setSelection: (selection: GridSelection) => void) => {
  let selection: GridSelection | undefined;
  const touchHandleContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.assign(touchHandleContainer.style, touchHandleContainerStyles);
  touchHandleContainer.innerHTML =
    '<g stroke-width=1.5 stroke="rgb(0,128,255)" fill=white><circle r=6 /><circle r=6 /></g><g fill=transparent pointer-events=fill><circle r=12 /><circle r=12 /></g>';
  const [g1, g2] = touchHandleContainer.children as HTMLCollectionOf<SVGGElement> & [SVGGElement, SVGGElement];
  const [tlHandle, brHandle] = g1.children as HTMLCollectionOf<SVGCircleElement> & [SVGCircleElement, SVGCircleElement];
  const [tlMargin, brMargin] = g2.children as HTMLCollectionOf<SVGCircleElement> & [SVGCircleElement, SVGCircleElement];
  const hideTouchHandle = () => touchHandleContainer.remove();
  const _setSelection = (area: GridArea, activeCell?: GridCell) => {
    setSelection((selection = { areas: [area], activeCell: activeCell ?? rc(area.r0, area.c0) }));
    const rect = context.getAreaRect(area);
    tlHandle.cx.baseVal.value = tlMargin.cx.baseVal.value = rect.x;
    tlHandle.cy.baseVal.value = tlMargin.cy.baseVal.value = rect.y;
    brHandle.cx.baseVal.value = brMargin.cx.baseVal.value = rect.x + rect.w;
    brHandle.cy.baseVal.value = brMargin.cy.baseVal.value = rect.y + rect.h;
  };

  signal.addEventListener("abort", hideTouchHandle, { once: true });

  addEventListener("keydown", ({ key }) => key !== "Control" && key !== "Meta" && key !== "Alt" && key !== "Shift" && hideTouchHandle(), {
    signal,
  });

  context.rootElement.addEventListener(
    "pointerdown",
    e => {
      if (!(e.pointerType === "touch" || e.pointerType === "pen")) {
        hideTouchHandle();
        return;
      }
      const area = context.getCellAreaFromPoint(e);
      if (area) {
        _setSelection(area);
        (e.currentTarget as Element).parentElement!.append(touchHandleContainer);
      }
    },
    { signal },
  );

  g2.addEventListener("pointerdown", e => {
    if (!selection || !(e.pointerType === "touch" || e.pointerType === "pen")) {
      hideTouchHandle();
      return;
    }
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
  });
};
