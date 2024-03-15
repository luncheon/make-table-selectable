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
	readonly signal: AbortSignal;
	readonly context: GridContext<CellElement>;
	readonly render: (selection: GridSelection | undefined) => void;
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
	render(): void;
	keydown(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">): boolean;
}
export declare const makeTableSelectable: (options: Omit<MakeTableSelectableOptions<HTMLTableCellElement>, "render" | "signal"> & {
	readonly signal?: AbortSignal;
}) => MakeTableSelectable<HTMLTableCellElement>;
export declare class MergeableTableGridContext implements GridContext<HTMLTableCellElement> {
	#private;
	readonly rootElement: HTMLTableElement | HTMLTableSectionElement;
	constructor(rootElement: HTMLTableElement | HTMLTableSectionElement);
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