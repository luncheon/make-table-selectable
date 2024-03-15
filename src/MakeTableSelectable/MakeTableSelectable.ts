import { handlePointerEvents } from "./handlePointerEvents.js";
import { handleTouchEvents } from "./handleTouchEvents.js";
import { keyboardShortcuts } from "./keyboardShortcuts.js";
import type { GridArea, GridContext, GridSelection } from "./types.js";
import { areasEqual } from "./util.js";

export class SelectedRow<CellElement> {
  readonly #context: GridContext<CellElement>;
  readonly #r: number;
  readonly #c: number;
  readonly #cs: number;

  constructor(context: GridContext<CellElement>, r: number, c: number, cs: number) {
    this.#context = context;
    this.#r = r;
    this.#c = c;
    this.#cs = cs;
  }

  get rowIndex() {
    return this.#r;
  }

  #cellsCache: readonly CellElement[] | undefined;
  #cells() {
    return Array.from({ length: this.#cs }, (_, c) => this.#context.getCellElement(this.#r, this.#c + c)!);
  }
  get cells() {
    return (this.#cellsCache ??= this.#cells());
  }
}

export class SelectedArea<CellElement> {
  readonly #context: GridContext<CellElement>;
  readonly #area: GridArea;

  constructor(context: GridContext<CellElement>, area: GridArea) {
    this.#context = context;
    this.#area = area;
  }

  #rowsCache: readonly SelectedRow<CellElement>[] | undefined;
  #rows() {
    const area = this.#area;
    return Array.from(
      { length: area.r1 - area.r0 + 1 },
      (_, r) => new SelectedRow(this.#context, area.r0 + r, area.c0, area.c1 - area.c0 + 1),
    );
  }
  get rows() {
    return (this.#rowsCache ??= this.#rows());
  }
}

export type MakeTableSelectableOptions<CellElement> = {
  readonly signal: AbortSignal;
  readonly context: GridContext<CellElement>;
  readonly render: (selection: GridSelection | undefined) => void;
  readonly keyboardEventTarget?: GlobalEventHandlers;
  readonly onActiveCellChanged?: (selectable: MakeTableSelectable<CellElement>) => unknown;
  readonly onSelectionChanged?: (selectable: MakeTableSelectable<CellElement>) => unknown;
  readonly onModeChanged?: (selectable: MakeTableSelectable<CellElement>) => unknown;
};

export class MakeTableSelectable<CellElement> {
  readonly keyboardShortcuts = keyboardShortcuts();
  #selection: GridSelection | undefined;

  constructor(readonly options: MakeTableSelectableOptions<CellElement>) {
    const signal = options.signal;
    const context = options.context;
    const setSelection = (selection: GridSelection) => this.#setSelection(selection);
    this.render();
    (options.keyboardEventTarget ?? context.rootElement).addEventListener("keydown", e => this.keydown(e) && e.preventDefault(), {
      signal,
    });
    handlePointerEvents(signal, context, () => this.#selection, setSelection);
    handleTouchEvents(signal, context, setSelection);
  }

  get activeCellAddress() {
    return this.#selection?.activeCell;
  }

  get activeCellElement() {
    const a = this.#selection?.activeCell;
    return a && this.options.context.getCellElement(a.r, a.c);
  }

  #selectedAreasCache: readonly SelectedArea<CellElement>[] | undefined;
  #selectedAreas() {
    return this.#selection?.areas.map(area => new SelectedArea<CellElement>(this.options.context, area)) ?? [];
  }
  get selectedAreas() {
    return (this.#selectedAreasCache ??= this.#selectedAreas());
  }

  get endMode() {
    return this.#selection?.endMode;
  }
  get expandMode() {
    return this.#selection?.extendMode;
  }

  render(): void {
    this.options.render(this.#selection);
  }

  keydown(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">) {
    const selection = this.#selection;
    const handler =
      selection &&
      this.keyboardShortcuts.get(`${e.ctrlKey || e.metaKey ? "C" : "_"}${e.altKey ? "A" : "_"}${e.shiftKey ? "S" : "_"}${e.key}`);
    handler && this.#setSelection(handler(this.options.context, selection));
    return !!handler;
  }

  #setSelection(newSelection: GridSelection | undefined) {
    const oldSelection = this.#selection;
    if (oldSelection === newSelection) {
      return;
    }

    const oldActiveCell = oldSelection?.activeCell;
    const newActiveCell = newSelection?.activeCell;
    const activeCellChanged = oldActiveCell?.r !== newActiveCell?.r || oldActiveCell?.c !== newActiveCell?.c;

    const oldAreas = oldSelection?.areas;
    const newAreas = newSelection?.areas;
    const selectionChanged = oldAreas?.length !== newAreas?.length || oldAreas?.some((oldArea, i) => !areasEqual(oldArea, newAreas![i]!));

    this.#selection = newSelection;
    if (activeCellChanged || selectionChanged) {
      this.#selectedAreasCache = undefined;
      this.render();
      activeCellChanged && this.options.onActiveCellChanged?.(this);
      selectionChanged && this.options.onSelectionChanged?.(this);
    }
    if (oldSelection?.extendMode !== newSelection?.extendMode || oldSelection?.endMode !== newSelection?.endMode) {
      this.options.onModeChanged?.(this);
    }
  }
}