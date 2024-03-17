import type { GridContext, GridRect, GridSelection, GridSelectionRenderer } from "./MakeTableSelectable/types.js";

export type FillStrokeStyle = {
  readonly fill?: string;
  readonly "fill-opacity"?: string;
  readonly stroke?: string;
  readonly "stroke-opacity"?: string;
  readonly "stroke-width"?: string | number;
  readonly "stroke-linejoin"?: string;
  readonly "stroke-dasharray"?: string;
  readonly "stroke-dashoffset"?: string;
};

export type SelectionRendererAppearance = {
  readonly inactiveArea: FillStrokeStyle;
  readonly activeArea: FillStrokeStyle;
  readonly activeCell?: FillStrokeStyle;
  readonly touchHandle: FillStrokeStyle & { readonly r?: string | number };
};

const createSvgElement = <K extends keyof SVGElementTagNameMap>(
  qualifiedName: K,
  attributes?: { readonly [K in string]?: string | number },
  styles?: Partial<Readonly<CSSStyleDeclaration>>,
  children?: readonly SVGElement[],
) => {
  const element = document.createElementNS("http://www.w3.org/2000/svg", qualifiedName);
  if (attributes) {
    for (const [name, value] of Object.entries(attributes)) {
      element.setAttribute(name, value as string);
    }
  }
  Object.assign(element.style, styles);
  children && element.append(...children);
  return element;
};

const createRootElement = ({
  inactiveArea,
  activeCell,
  touchHandle,
  activeArea: { fill: activeAreaFill, "fill-opacity": activeAreaFillOpacity, ...activeAreaStroke },
}: SelectionRendererAppearance) => {
  const touchHandleStyle = { r: 6, "stroke-width": 1.5, ...touchHandle };
  return createSvgElement(
    "svg",
    { width: "100%", height: "100%", fill: "none" },
    { position: "absolute", inset: "0", pointerEvents: "none" },
    [
      createSvgElement("path", inactiveArea),
      createSvgElement("path", { fill: activeAreaFill, "fill-opacity": activeAreaFillOpacity, "fill-rule": "evenodd" }),
      createSvgElement("path", { "stroke-width": 2, ...activeAreaStroke }),
      createSvgElement("path", activeCell),
      createSvgElement("circle", touchHandleStyle),
      createSvgElement("circle", touchHandleStyle),
    ],
  );
};

const rectPath = (rect: GridRect) => `M${rect.x} ${rect.y}h${rect.w}v${rect.h}h${-rect.w}Z`;

export class SelectionRenderer implements GridSelectionRenderer {
  #overlayContainer: SVGSVGElement | undefined;

  constructor(readonly appearance: SelectionRendererAppearance) {}

  destroy() {
    this.#overlayContainer?.remove();
  }

  render(context: GridContext, selection: GridSelection | undefined) {
    const [
      inactiveAreaPathElement,
      activeAreaFillPathElement,
      activeAreaStrokePathElement,
      activeCellPathElement,
      tlTouchHandle,
      brTouchHandle,
    ] = (this.#overlayContainer ??= context.rootElement.parentElement!.appendChild(createRootElement(this.appearance)))
      .children as HTMLCollection & [SVGPathElement, SVGPathElement, SVGRectElement, SVGRectElement, SVGCircleElement, SVGCircleElement];
    if (selection) {
      const inactiveAreasPath = selection.areas.slice(1).map(area => rectPath(context.getAreaRect(area)));
      const activeAreaRect = context.getAreaRect(selection.areas[0]!);
      const activeAreaPath = rectPath(activeAreaRect);
      const activeCell = selection.activeCell;
      const activeCellPath = rectPath(context.getAreaRect(context.getCellArea(activeCell.r, activeCell.c)));
      inactiveAreaPathElement.setAttribute("d", inactiveAreasPath.slice(1).join(""));
      activeAreaFillPathElement.setAttribute("d", `${activeAreaPath} ${activeCellPath}`);
      activeAreaStrokePathElement.setAttribute("d", activeAreaPath);
      activeCellPathElement.setAttribute("d", activeCellPath);
      if (selection.touchMode) {
        tlTouchHandle.setAttribute("cx", activeAreaRect.x as string & number);
        tlTouchHandle.setAttribute("cy", activeAreaRect.y as string & number);
        brTouchHandle.setAttribute("cx", (activeAreaRect.x + activeAreaRect.w) as string & number);
        brTouchHandle.setAttribute("cy", (activeAreaRect.y + activeAreaRect.h) as string & number);
      }
    } else {
      inactiveAreaPathElement.removeAttribute("d");
      activeAreaFillPathElement.removeAttribute("d");
      activeAreaStrokePathElement.removeAttribute("d");
      activeCellPathElement.removeAttribute("d");
    }
    if (!selection?.touchMode) {
      tlTouchHandle.removeAttribute("cx");
      brTouchHandle.removeAttribute("cx");
    }
  }
}
