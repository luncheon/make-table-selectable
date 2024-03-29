import { despan } from "despan";
import type { GridArea, GridContext, GridPoint } from "./MakeTableSelectable/types.js";
import { normalizeExtendedArea, tlbr } from "./MakeTableSelectable/util.js";

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
    const rows = Array.prototype.flatMap.call(this.rootElement.tBodies, despan) as ReturnType<typeof despan>;
    const columnHeaderCount = rows[0]?.findIndex(cell => cell.tagName === "TD") ?? 0;
    const cellAreaMap = new WeakMap<HTMLTableCellElement, GridArea>();
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r]!;
      cells.splice(0, columnHeaderCount);
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

  merge(area: GridArea) {
    area = normalizeExtendedArea(this, area);
    const baseCell = this.getCellElement(area.r0, area.c0);
    if (!baseCell) {
      return;
    }
    const removedCells = new Set<HTMLTableCellElement>();
    for (let r = area.r0; r <= area.r1; r++) {
      for (let c = area.c0; c <= area.c1; c++) {
        const cell = this.getCellElement(r, c);
        cell && removedCells.add(cell);
      }
    }
    removedCells.delete(baseCell);
    for (const cell of removedCells) {
      cell.remove();
    }
    baseCell.rowSpan = area.r1 - area.r0 + 1;
    baseCell.colSpan = area.c1 - area.c0 + 1;
    this.refresh();
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

  getCellAreaFromPoint(p: GridPoint, searchNearest?: boolean) {
    const rows = this.#rows;
    if (!rows[0]?.[0]) {
      return;
    }
    const area = this.#getCellAreaFromPoint(p.clientX, p.clientY);
    if (area || !searchNearest) {
      return area;
    }
    const tl = rows[0][0].getBoundingClientRect();
    const br = rows.at(-1)!.at(-1)!.getBoundingClientRect();
    const r = p.clientY < tl.y ? 0 : p.clientY > br.bottom ? rows[0].length - 1 : this.#getCellAreaFromPoint(tl.x, p.clientY)?.r0;
    const c = p.clientX < tl.x ? 0 : p.clientX > br.right ? rows.length - 1 : this.#getCellAreaFromPoint(p.clientX, tl.y)?.c0;
    if (r !== undefined && c !== undefined) {
      return this.getCellArea(r, c);
    }
  }

  #getCellAreaFromPoint(clientX: number, clientY: number) {
    const td = document
      .elementsFromPoint(clientX, clientY)
      .find(el => el instanceof HTMLTableCellElement && el.parentElement?.parentElement?.parentElement === this.rootElement);
    return td && this.#cellAreaMap.get(td as HTMLTableCellElement);
  }
}
