import type { GridContext, GridRenderer, GridSelection } from "./MakeTableSelectable/types.js";

const overlayStyleBase: Partial<CSSStyleDeclaration> = {
  boxSizing: "border-box",
  pointerEvents: "none",
  position: "absolute",
  border: "0 solid rgba(0, 128, 255, 0.2)",
  outline: "auto 2px rgb(0, 128, 255)",
  outlineOffset: "-1px",
  background: "rgba(128, 224, 255, 0.2)",
  // transitionProperty: "left,top,width,height,border-width",
  // transitionDuration: "64ms",
  // transitionTimingFunction: "linear",
};

const h = <K extends keyof HTMLElementTagNameMap>(tagName: K, style: Partial<CSSStyleDeclaration>) => {
  const overlay = document.createElement(tagName);
  Object.assign(overlay.style, style);
  return overlay;
};

export class DefaultRenderer implements GridRenderer {
  #overlayContainer: HTMLElement | undefined;

  destroy() {
    this.#overlayContainer?.remove();
  }

  render(context: GridContext, selection: GridSelection | undefined) {
    const overlayContainer = (this.#overlayContainer ??= context.rootElement.parentElement!.appendChild(document.createElement("div")));
    if (!selection) {
      overlayContainer.innerHTML = "";
      return;
    }
    const areas = selection.areas;
    while (overlayContainer.children.length > areas.length) {
      overlayContainer.lastElementChild!.remove();
    }
    let overlay = overlayContainer.firstElementChild as HTMLElement | null;
    for (let i = 0; i < areas.length; i++) {
      const rect = context.getAreaRect(areas[i]!);
      const overlayStyle = (overlay ??= overlayContainer.appendChild(h("div", overlayStyleBase))).style;
      overlayStyle.left = `${rect.x}px`;
      overlayStyle.top = `${rect.y}px`;
      overlayStyle.width = `${rect.w}px`;
      overlayStyle.height = `${rect.h}px`;
      if (i === 0) {
        const activeCell = selection.activeCell;
        const activeRect = context.getAreaRect(context.getCellArea(activeCell.r, activeCell.c));
        overlayStyle.borderWidth = `${activeRect.y - rect.y}px ${rect.x + rect.w - activeRect.x - activeRect.w}px ${
          rect.y + rect.h - activeRect.y - activeRect.h
        }px ${activeRect.x - rect.x}px`;
      } else {
        overlayStyle.borderWidth = `${rect.h / 2}px ${rect.w / 2}px`;
      }
      overlay = overlay.nextElementSibling as HTMLElement | null;
    }
  }
}
