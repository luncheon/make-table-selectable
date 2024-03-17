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
  readonly touchHandle: FillStrokeStyle & { readonly r?: number };
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
  const touchHandleMarginStyle = { r: Math.max(12, touchHandleStyle.r ?? 0), fill: "transparent", "pointer-events": "fill" };
  return createSvgElement(
    "svg",
    { width: "100%", height: "100%", fill: "none" },
    { position: "absolute", inset: "0", pointerEvents: "none", touchAction: "none" },
    [
      createSvgElement("g", inactiveArea),
      createSvgElement("path", { fill: activeAreaFill, "fill-opacity": activeAreaFillOpacity, "fill-rule": "evenodd" }),
      createSvgElement("rect", { "stroke-width": 2, ...activeAreaStroke }),
      createSvgElement("rect", activeCell),
      createSvgElement("g", undefined, undefined, [
        createSvgElement("circle", touchHandleStyle),
        createSvgElement("circle", touchHandleStyle),
        createSvgElement("circle", touchHandleMarginStyle),
        createSvgElement("circle", touchHandleMarginStyle),
      ]),
    ],
  );
};

const setRectElementRect = (rectElement: SVGRectElement, rect: GridRect) => {
  rectElement.x.baseVal.value = rect.x;
  rectElement.y.baseVal.value = rect.y;
  rectElement.width.baseVal.value = rect.w;
  rectElement.height.baseVal.value = rect.h;
};

export class SelectionRenderer implements GridSelectionRenderer {
  readonly #container;
  readonly #elements;
  readonly #liveInactiveAreaRects;
  readonly #touchHandles;
  readonly touchHandle;

  constructor(readonly appearance: SelectionRendererAppearance) {
    this.#container = createRootElement(this.appearance);
    this.#elements = [...this.#container.children] as [SVGGElement, SVGPathElement, SVGRectElement, SVGRectElement, SVGGElement];
    this.#liveInactiveAreaRects = this.#elements[0].children as HTMLCollectionOf<SVGRectElement>;
    this.touchHandle = this.#elements[4];
    this.#touchHandles = [...this.touchHandle.children] as [SVGCircleElement, SVGCircleElement, SVGCircleElement, SVGCircleElement];
  }

  destroy() {
    this.#container?.remove();
  }

  render(context: GridContext, selection: GridSelection | undefined) {
    const overlayContainer = this.#container;
    overlayContainer.parentElement !== context.rootElement.parentElement && context.rootElement.parentElement!.append(overlayContainer);
    overlayContainer.style.display = selection ? "" : "none";
    if (selection) {
      const { areas, activeCell } = selection;
      const activeAreaRect = context.getAreaRect(areas[0]!);
      const activeCellRect = context.getAreaRect(context.getCellArea(activeCell.r, activeCell.c));
      while (this.#liveInactiveAreaRects.length >= areas.length) {
        this.#elements[0].lastElementChild!.remove();
      }
      for (let i = 1; i < areas.length; i++) {
        setRectElementRect(
          this.#liveInactiveAreaRects[i - 1] ?? this.#elements[0].appendChild(createSvgElement("rect")),
          context.getAreaRect(areas[i]!),
        );
      }
      this.#elements[1].setAttribute(
        "d",
        `M${activeAreaRect.x} ${activeAreaRect.y}h${activeAreaRect.w}v${activeAreaRect.h}h${-activeAreaRect.w}Z M${activeCellRect.x} ${
          activeCellRect.y
        }h${activeCellRect.w}v${activeCellRect.h}h${-activeCellRect.w}Z`,
      );
      setRectElementRect(this.#elements[2], activeAreaRect);
      setRectElementRect(this.#elements[3], activeCellRect);
      this.touchHandle.style.display = selection.touchMode ? "" : "none";
      if (selection.touchMode) {
        this.#touchHandles[0].cx.baseVal.value = this.#touchHandles[2].cx.baseVal.value = activeAreaRect.x;
        this.#touchHandles[0].cy.baseVal.value = this.#touchHandles[2].cy.baseVal.value = activeAreaRect.y;
        this.#touchHandles[1].cx.baseVal.value = this.#touchHandles[3].cx.baseVal.value = activeAreaRect.x + activeAreaRect.w;
        this.#touchHandles[1].cy.baseVal.value = this.#touchHandles[3].cy.baseVal.value = activeAreaRect.y + activeAreaRect.h;
      }
    }
  }
}
