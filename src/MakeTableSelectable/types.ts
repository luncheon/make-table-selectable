export type GridCell = {
  readonly r: number;
  readonly c: number;
};

export type GridArea = {
  readonly r0: number;
  readonly c0: number;
  readonly r1: number;
  readonly c1: number;
};

export type GridRect = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

export type GridSelection = {
  readonly areas: readonly GridArea[];
  readonly activeCell: GridCell;
  readonly endMode?: boolean;
  readonly extendMode?: boolean;
};

export type GridContext<CellElement = unknown> = {
  readonly rootElement: GlobalEventHandlers & Element;
  readonly rowCount: number;
  readonly columnCount: number;
  readonly getCellElement: (r: number, c: number) => CellElement | undefined;
  readonly getCellArea: (r: number, c: number) => GridArea;
  readonly getCellAreaFromPoint: (p: { readonly clientX: number; readonly clientY: number }) => GridArea | undefined;
  readonly getAreaRect: (area: GridArea) => GridRect;
  readonly isNonblankCell: (r: number, c: number) => boolean;
};
