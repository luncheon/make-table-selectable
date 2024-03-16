import type { GridContext, GridRect, GridRenderer, GridSelection } from "./MakeTableSelectable/types.js";

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

export type DefaultRendererTheme = {
  readonly inactiveArea: FillStrokeStyle;
  readonly activeArea: FillStrokeStyle;
  readonly activeCell?: FillStrokeStyle;
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
  activeArea: { fill: activeAreaFill, "fill-opacity": activeAreaFillOpacity, ...activeAreaStroke },
}: DefaultRendererTheme) =>
  createSvgElement("svg", { width: "100%", height: "100%", fill: "none" }, { position: "absolute", inset: "0", pointerEvents: "none" }, [
    createSvgElement("path", inactiveArea),
    createSvgElement("path", { fill: activeAreaFill, "fill-opacity": activeAreaFillOpacity, "fill-rule": "evenodd" }),
    createSvgElement("path", { "stroke-width": 2, ...activeAreaStroke }),
    createSvgElement("path", activeCell),
  ]);

const rectPath = (rect: GridRect) => `M${rect.x} ${rect.y}h${rect.w}v${rect.h}h${-rect.w}Z`;

export class DefaultRenderer implements GridRenderer {
  #overlayContainer: SVGSVGElement | undefined;

  constructor(readonly theme: DefaultRendererTheme) {}

  destroy() {
    this.#overlayContainer?.remove();
  }

  render(context: GridContext, selection: GridSelection | undefined) {
    const [inactiveAreaPathElement, activeAreaFillPathElement, activeAreaStrokePathElement, activeCellPathElement] =
      (this.#overlayContainer ??= context.rootElement.parentElement!.appendChild(createRootElement(this.theme)))
        .children as HTMLCollection & [SVGPathElement, SVGPathElement, SVGRectElement, SVGRectElement];
    if (selection) {
      const areaPaths = selection.areas.map(area => rectPath(context.getAreaRect(area)));
      const activeCell = selection.activeCell;
      const activeCellPath = rectPath(context.getAreaRect(context.getCellArea(activeCell.r, activeCell.c)));
      inactiveAreaPathElement.setAttribute("d", areaPaths.slice(1).join(""));
      activeAreaFillPathElement.setAttribute("d", `${areaPaths[0]!} ${activeCellPath}`);
      activeAreaStrokePathElement.setAttribute("d", areaPaths[0]!);
      activeCellPathElement.setAttribute("d", activeCellPath);
    } else {
      inactiveAreaPathElement.removeAttribute("d");
      activeAreaFillPathElement.removeAttribute("d");
      activeAreaStrokePathElement.removeAttribute("d");
      activeCellPathElement.removeAttribute("d");
    }
  }
}
