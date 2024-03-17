type GridCell = {
	readonly r: number;
	readonly c: number;
};
type GridArea = {
	readonly r0: number;
	readonly c0: number;
	readonly r1: number;
	readonly c1: number;
};
type GridRect = {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
};
type GridSelection = {
	readonly areas: readonly GridArea[];
	readonly activeCell: GridCell;
	readonly endMode?: boolean;
	readonly extendMode?: boolean;
	readonly touchMode?: boolean;
};
type GridContext<CellElement = unknown> = {
	readonly rootElement: GlobalEventHandlers & Element;
	readonly rowCount: number;
	readonly columnCount: number;
	readonly getCellElement: (r: number, c: number) => CellElement | undefined;
	readonly getCellArea: (r: number, c: number) => GridArea;
	readonly getCellAreaFromPoint: (p: {
		readonly clientX: number;
		readonly clientY: number;
	}) => GridArea | undefined;
	readonly getAreaRect: (area: GridArea) => GridRect;
	readonly isNonblankCell: (r: number, c: number) => boolean;
};
type GridSelectionRenderer = {
	readonly touchHandle: GlobalEventHandlers;
	readonly destroy: () => void;
	readonly render: (context: GridContext, selection: GridSelection | undefined) => void;
};
declare class SelectedRow<CellElement> {
	#private;
	constructor(context: GridContext<CellElement>, r: number, c: number, cs: number);
	get rowIndex(): number;
	get cells(): readonly CellElement[];
}
declare class SelectedArea<CellElement> {
	#private;
	constructor(context: GridContext<CellElement>, area: GridArea);
	get rows(): readonly SelectedRow<CellElement>[];
}
type MakeTableSelectableOptions<CellElement> = {
	readonly context: GridContext<CellElement>;
	readonly renderer: GridSelectionRenderer;
	readonly keyboardEventTarget?: GlobalEventHandlers;
	readonly onActiveCellChanged?: (selectable: MakeTableSelectable<CellElement>) => unknown;
	readonly onSelectionChanged?: (selectable: MakeTableSelectable<CellElement>) => unknown;
	readonly onModeChanged?: (selectable: MakeTableSelectable<CellElement>) => unknown;
};
declare class MakeTableSelectable<CellElement> {
	#private;
	readonly options: MakeTableSelectableOptions<CellElement>;
	readonly keyboardShortcuts: Map<`C__${string}` | `C_S${string}` | `CA_${string}` | `CAS${string}` | `___${string}` | `__S${string}` | `_A_${string}` | `_AS${string}`, (context: GridContext, selection: GridSelection) => GridSelection>;
	constructor(options: MakeTableSelectableOptions<CellElement>);
	get activeCellAddress(): GridCell | undefined;
	get activeCellElement(): CellElement | undefined;
	get selectedAreas(): readonly SelectedArea<CellElement>[];
	get endMode(): boolean | undefined;
	get expandMode(): boolean | undefined;
	get touchMode(): boolean | undefined;
	destroy(): void;
	render(): void;
	keydown(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">): boolean;
}
type FillStrokeStyle = {
	readonly fill?: string;
	readonly "fill-opacity"?: string;
	readonly stroke?: string;
	readonly "stroke-opacity"?: string;
	readonly "stroke-width"?: string | number;
	readonly "stroke-linejoin"?: string;
	readonly "stroke-dasharray"?: string;
	readonly "stroke-dashoffset"?: string;
};
type SelectionRendererAppearance = {
	readonly inactiveArea: FillStrokeStyle;
	readonly activeArea: FillStrokeStyle;
	readonly activeCell?: FillStrokeStyle;
	readonly touchHandle: FillStrokeStyle & {
		readonly r?: number;
	};
};
export declare const makeTableSelectable: (options: Omit<MakeTableSelectableOptions<HTMLTableCellElement>, "renderer"> & {
	readonly appearance: SelectionRendererAppearance;
}) => MakeTableSelectable<HTMLTableCellElement>;
export declare class MergeableTableGridContext implements GridContext<HTMLTableCellElement> {
	#private;
	readonly rootElement: HTMLTableElement;
	constructor(rootElement: HTMLTableElement);
	get rowCount(): number;
	get columnCount(): number;
	refresh(): void;
	getCellElement(r: number, c: number): HTMLTableCellElement | undefined;
	isNonblankCell(r: number, c: number): boolean;
	getCellArea(r: number, c: number): GridArea;
	getAreaRect(area: GridArea): {
		x: number;
		y: number;
		w: number;
		h: number;
	};
	getCellAreaFromPoint(p: {
		readonly clientX: number;
		readonly clientY: number;
	}): GridArea | undefined;
}

export {};
