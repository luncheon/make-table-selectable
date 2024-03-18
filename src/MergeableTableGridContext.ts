import { despan } from "despan";
import type { GridArea, GridContext } from "./MakeTableSelectable/types.js";
import { tlbr } from "./MakeTableSelectable/util.js";

export class MergeableTableGridContext implements GridContext<HTMLTableCellElement> {
  #rows!: readonly (readonly HTMLTableCellElement[])[];
  #cellAreaMap!: { readonly get: (key: HTMLTableCellElement) => GridArea | undefined };

  constructor(readonly rootElement: HTMLTableElement) {
    this.refresh();
  }

  get rowCount() {
    return this.#rows.length;
  }

  get columnCount() {
    return this.#rows[0]?.length ?? 0;
  }

  refresh() {
    const rows = despan(this.rootElement);
    const cellAreaMap = new WeakMap<HTMLTableCellElement, GridArea>();
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r]!;
      for (let c = 0; c < cells.length; c++) {
        const element = cells[c];
        if (element) {
          const area = cellAreaMap.get(element);
          cellAreaMap.set(element, area ? tlbr(area.r0, area.c0, r, c) : tlbr(r, c, r, c));
        }
      }
    }
    this.#rows = rows;
    this.#cellAreaMap = cellAreaMap;
  }

  getCellElement(r: number, c: number) {
    return this.#rows[r]?.[c];
  }

  isNonblankCell(r: number, c: number) {
    return !!this.#rows[r]?.[c]?.textContent;
  }

  getCellArea(r: number, c: number) {
    return this.#cellAreaMap.get(this.#rows[r]?.[c]!)!;
  }

  getAreaRect(area: GridArea) {
    const rows = this.#rows;
    const { offsetLeft: rootX, offsetTop: rootY } = this.rootElement;
    const { offsetLeft: x, offsetTop: y } = rows[area.r0]![area.c0]!;
    const br = rows[area.r1]![area.c1]!;
    return { x: rootX + x, y: rootY + y, w: br.offsetLeft + br.offsetWidth - x, h: br.offsetTop + br.offsetHeight - y };
  }

  getCellAreaFromPoint(p: { readonly clientX: number; readonly clientY: number }) {
    const td = document
      .elementsFromPoint(p.clientX, p.clientY)
      .find(el => el instanceof HTMLTableCellElement && el.parentElement?.parentElement?.parentElement === this.rootElement);
    return td && this.#cellAreaMap.get(td as HTMLTableCellElement);
  }
}
