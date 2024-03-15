import type { GridArea, GridCell, GridContext, GridSelection } from "./types.js";
import { areaContainsCell, areasEqual, normalizeExtendedArea, rc, singleCellSelection, tlbr } from "./util.js";

const someInRange = (lower: number, upper: number, predicate: (n: number) => unknown) => {
  for (let i = lower; i <= upper; i++) {
    if (predicate(i)) {
      return 1;
    }
  }
  return 0;
};
const minInRange = (lower: number, upper: number, selector: (n: number) => number) => {
  let min = selector(lower);
  for (let i = lower + 1; i <= upper; i++) {
    min = Math.min(min, selector(i));
  }
  return min;
};
const maxInRange = (lower: number, upper: number, selector: (n: number) => number) => {
  let max = selector(lower);
  for (let i = lower + 1; i <= upper; i++) {
    max = Math.max(max, selector(i));
  }
  return max;
};

const updateActiveArea =
  (callback: (context: GridContext, area: GridArea, activeCell: GridCell) => GridArea) =>
  (context: GridContext, selection: GridSelection): GridSelection => {
    const areas = selection.areas;
    const activeCell = selection.activeCell;
    const area = callback(context, areas[0]!, activeCell);
    return area === areas[0]
      ? selection
      : { areas: areas.length === 1 ? [area] : [area, ...areas.slice(1)], activeCell, extendMode: selection.extendMode };
  };

const updatePartialSelection =
  (callback: (context: GridContext, selection: GridSelection) => Partial<GridSelection>) =>
  (context: GridContext, selection: GridSelection): GridSelection => ({ ...selection, ...callback(context, selection) });

const moveCellUp = (context: GridContext, cell: GridCell): GridCell | undefined => {
  const r0 = context.getCellArea(cell.r, cell.c).r0;
  return r0 ? rc(r0 - 1, cell.c) : undefined;
};
const moveCellDown = (context: GridContext, cell: GridCell): GridCell | undefined => {
  const r1 = context.getCellArea(cell.r, cell.c).r1;
  return r1 < context.rowCount - 1 ? rc(r1 + 1, cell.c) : undefined;
};
const moveCellLeft = (context: GridContext, cell: GridCell): GridCell | undefined => {
  const c0 = context.getCellArea(cell.r, cell.c).c0;
  return c0 ? rc(cell.r, c0 - 1) : undefined;
};
const moveCellRight = (context: GridContext, cell: GridCell): GridCell | undefined => {
  const c1 = context.getCellArea(cell.r, cell.c).c1;
  return c1 < context.columnCount - 1 ? rc(cell.r, c1 + 1) : undefined;
};

const spiralCellUpInArea = ({ r, c }: GridCell, a: GridArea): GridCell => (r > a.r0 ? rc(r - 1, c) : rc(a.r1, c > a.c0 ? c - 1 : a.c1));
const spiralCellDownInArea = ({ r, c }: GridCell, a: GridArea): GridCell => (r < a.r1 ? rc(r + 1, c) : rc(a.r0, c < a.c1 ? c + 1 : a.c0));
const spiralCellLeftInArea = ({ r, c }: GridCell, a: GridArea): GridCell => (c > a.c0 ? rc(r, c - 1) : rc(r > a.r0 ? r - 1 : a.r1, a.c1));
const spiralCellRightInArea = ({ r, c }: GridCell, a: GridArea): GridCell => (c < a.c1 ? rc(r, c + 1) : rc(r < a.r1 ? r + 1 : a.r0, a.c0));
const spiralActiveCellUp = updatePartialSelection((context, { areas, activeCell }) => {
  const area = areas[0]!;
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (areas.length !== 1 && activeCellArea.r0 === area.r0 && activeCellArea.c0 === area.c0) {
    const nextArea = areas.at(-1)!;
    return { areas: [nextArea, ...areas.slice(0, -1)], activeCell: rc(nextArea.r1, nextArea.c1) };
  }
  let cell = rc(activeCellArea.r0, activeCell.c);
  if (areasEqual(activeCellArea, area)) {
    return { areas: [context.getCellArea(activeCell.r, activeCell.c)], activeCell: cell };
  }
  do {
    cell = spiralCellUpInArea(cell, area);
  } while (areasEqual(activeCellArea, context.getCellArea(cell.r, cell.c)));
  return { activeCell: cell };
});
const spiralActiveCellDown = updatePartialSelection((context, { areas, activeCell }) => {
  const area = areas[0]!;
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (areas.length !== 1 && activeCellArea.r1 === area.r1 && activeCellArea.c1 === area.c1) {
    return { areas: [...areas.slice(1), area], activeCell: rc(areas[1]!.r0, areas[1]!.c0) };
  }
  let cell = rc(activeCellArea.r1, activeCell.c);
  if (areasEqual(activeCellArea, area)) {
    return { areas: [context.getCellArea(activeCell.r, activeCell.c)], activeCell: cell };
  }
  do {
    cell = spiralCellDownInArea(cell, area);
  } while (areasEqual(activeCellArea, context.getCellArea(cell.r, cell.c)));
  return { activeCell: cell };
});
const spiralActiveCellLeft = updatePartialSelection((context, { areas, activeCell }) => {
  const area = areas[0]!;
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (areas.length !== 1 && activeCellArea.r0 === area.r0 && activeCellArea.c0 === area.c0) {
    const nextArea = areas.at(-1)!;
    return { areas: [nextArea, ...areas.slice(0, -1)], activeCell: rc(nextArea.r1, nextArea.c1) };
  }
  let cell = rc(activeCell.r, activeCellArea.c0);
  if (areasEqual(activeCellArea, area)) {
    return { areas: [context.getCellArea(activeCell.r, activeCell.c)], activeCell: cell };
  }
  do {
    cell = spiralCellLeftInArea(cell, area);
  } while (areasEqual(activeCellArea, context.getCellArea(cell.r, cell.c)));
  return { activeCell: cell };
});
const spiralActiveCellRight = updatePartialSelection((context, { areas, activeCell }) => {
  const area = areas[0]!;
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (areas.length !== 1 && activeCellArea.r1 === area.r1 && activeCellArea.c1 === area.c1) {
    return { areas: [...areas.slice(1), area], activeCell: rc(areas[1]!.r0, areas[1]!.c0) };
  }
  let cell = rc(activeCell.r, activeCellArea.c1);
  if (areasEqual(activeCellArea, area)) {
    return { areas: [context.getCellArea(activeCell.r, activeCell.c)], activeCell: cell };
  }
  do {
    cell = spiralCellRightInArea(cell, area);
  } while (areasEqual(activeCellArea, context.getCellArea(cell.r, cell.c)));
  return { activeCell: cell };
});

const extendSelectionUp = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.r0 === activeCellArea.r0 && area.r1 !== activeCellArea.r1) {
    let r1 = area.r1 - 1;
    for (let prev = r1; prev !== (r1 = minInRange(area.c0, area.c1, c => context.getCellArea(r1 + 1, c).r0) - 1); prev = r1);
    const newArea = normalizeExtendedArea(context, { ...area, r1 });
    if (!areasEqual(newArea, area) && areaContainsCell(newArea, activeCell)) {
      return newArea;
    }
  }
  return area.r0 ? normalizeExtendedArea(context, { ...area, r0: area.r0 - 1 }) : area;
});
const extendSelectionDown = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.r1 === activeCellArea.r1 && area.r0 !== activeCellArea.r0) {
    let r0 = area.r0 + 1;
    for (let prev = r0; prev !== (r0 = maxInRange(area.c0, area.c1, c => context.getCellArea(r0 - 1, c).r1) + 1); prev = r0);
    const newArea = normalizeExtendedArea(context, { ...area, r0 });
    if (!areasEqual(newArea, area) && areaContainsCell(newArea, activeCell)) {
      return newArea;
    }
  }
  return area.r1 < context.rowCount - 1 ? normalizeExtendedArea(context, { ...area, r1: area.r1 + 1 }) : area;
});
const extendSelectionLeft = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.c0 === activeCellArea.c0 && area.c1 !== activeCellArea.c1) {
    let c1 = area.c1 - 1;
    for (let prev = c1; prev !== (c1 = minInRange(area.r0, area.r1, r => context.getCellArea(r, c1 + 1).c0) - 1); prev = c1);
    const newArea = normalizeExtendedArea(context, { ...area, c1 });
    if (!areasEqual(newArea, area) && areaContainsCell(newArea, activeCell)) {
      return newArea;
    }
  }
  return area.c0 ? normalizeExtendedArea(context, { ...area, c0: area.c0 - 1 }) : area;
});
const extendSelectionRight = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.c1 === activeCellArea.c1 && area.c0 !== activeCellArea.c0) {
    let c0 = area.c0 + 1;
    for (let prev = c0; prev !== (c0 = minInRange(area.r0, area.r1, r => context.getCellArea(r, c0 - 1).c1) + 1); prev = c0);
    const newArea = normalizeExtendedArea(context, { ...area, c0 });
    if (!areasEqual(newArea, area) && areaContainsCell(newArea, activeCell)) {
      return newArea;
    }
  }
  return area.c1 < context.columnCount - 1 ? normalizeExtendedArea(context, { ...area, c1: area.c1 + 1 }) : area;
});

const moveEndCellUp = (context: GridContext, cell: GridCell): GridCell | undefined => {
  let { r0: r, c0: c } = context.getCellArea(cell.r, cell.c);
  if (r) {
    if (context.isNonblankCell(r, c) && context.isNonblankCell(r - 1, c)) {
      while (--r && context.isNonblankCell(r - 1, c));
    } else {
      while (--r && !context.isNonblankCell(r, c));
    }
    return rc(r, c);
  }
};
const moveEndCellDown = (context: GridContext, cell: GridCell): GridCell | undefined => {
  let { r1: r, c1: c } = context.getCellArea(cell.r, cell.c);
  const maxRowIndex = context.rowCount - 1;
  if (r < maxRowIndex) {
    if (context.isNonblankCell(r, c) && context.isNonblankCell(r + 1, c)) {
      while (++r < maxRowIndex && context.isNonblankCell(r + 1, c));
    } else {
      while (++r < maxRowIndex && !context.isNonblankCell(r, c));
    }
    return rc(r, c);
  }
};
const moveEndCellLeft = (context: GridContext, cell: GridCell): GridCell | undefined => {
  let { r0: r, c0: c } = context.getCellArea(cell.r, cell.c);
  if (c) {
    if (context.isNonblankCell(r, c) && context.isNonblankCell(r, c - 1)) {
      while (--c && context.isNonblankCell(r, c - 1));
    } else {
      while (--c && !context.isNonblankCell(r, c));
    }
    return rc(r, c);
  }
};
const moveEndCellRight = (context: GridContext, cell: GridCell): GridCell | undefined => {
  let { r0: r, c1: c } = context.getCellArea(cell.r, cell.c);
  const maxColumnIndex = context.columnCount - 1;
  if (c < maxColumnIndex) {
    if (context.isNonblankCell(r, c) && context.isNonblankCell(r, c + 1)) {
      while (++c < maxColumnIndex && context.isNonblankCell(r, c + 1));
    } else {
      while (++c < maxColumnIndex && !context.isNonblankCell(r, c));
    }
    return rc(r, c);
  }
};

const extendEndSelectionUp = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.r0 === activeCellArea.r0 && area.r1 !== activeCellArea.r1) {
    const r = moveEndCellUp(context, rc(area.r1, activeCellArea.c0))?.r;
    if (r !== undefined) {
      return normalizeExtendedArea(context, { ...area, r0: Math.min(area.r0, r), r1: Math.max(area.r0, r) });
    }
  }
  const r0 = moveEndCellUp(context, rc(area.r0, activeCellArea.c0))?.r;
  return r0 !== undefined ? normalizeExtendedArea(context, { ...area, r0 }) : area;
});
const extendEndSelectionDown = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.r1 === activeCellArea.r1 && area.r0 !== activeCellArea.r0) {
    const r = moveEndCellDown(context, rc(area.r0, activeCellArea.c0))?.r;
    if (r !== undefined) {
      return normalizeExtendedArea(context, { ...area, r0: Math.min(area.r1, r), r1: Math.max(area.r1, r) });
    }
  }
  const r1 = moveEndCellDown(context, rc(area.r1, activeCellArea.c0))?.r;
  return r1 !== undefined ? normalizeExtendedArea(context, { ...area, r1 }) : area;
});
const extendEndSelectionLeft = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.c0 === activeCellArea.c0 && area.c1 !== activeCellArea.c1) {
    const c = moveEndCellLeft(context, rc(activeCellArea.r0, area.c1))?.c;
    if (c !== undefined) {
      return normalizeExtendedArea(context, { ...area, c0: Math.min(area.c0, c), c1: Math.max(area.c0, c) });
    }
  }
  const c0 = moveEndCellLeft(context, rc(activeCellArea.r0, area.c0))?.c;
  return c0 !== undefined ? normalizeExtendedArea(context, { ...area, c0 }) : area;
});
const extendEndSelectionRight = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.c1 === activeCellArea.c1 && area.c0 !== activeCellArea.c0) {
    const c = moveEndCellRight(context, rc(activeCellArea.r0, area.c0))?.c;
    if (c !== undefined) {
      return normalizeExtendedArea(context, { ...area, c0: Math.min(area.c1, c), c1: Math.max(area.c1, c) });
    }
  }
  const c1 = moveEndCellRight(context, rc(activeCellArea.r0, area.c1))?.c;
  return c1 !== undefined ? normalizeExtendedArea(context, { ...area, c1 }) : area;
});

const currentRegion = (context: GridContext, { r, c, r: r0, c: c0, r: r1, c: c1 }: GridCell): GridArea | undefined => {
  // fixme: it is hard to emulate the puzzling behavior of excel
  for (let updated = 0b1111; updated; ) {
    updated =
      (updated & 0b1101 && someInRange(c0 - 1, c1 + 1, c => context.isNonblankCell(r0 - 1, c)) && 0b1000) |
      (updated & 0b1110 && someInRange(r0 - 1, r1 + 1, r => context.isNonblankCell(r, c0 - 1)) && 0b0100) |
      (updated & 0b0111 && someInRange(c0 - 1, c1 + 1, c => context.isNonblankCell(r1 + 1, c)) && 0b0010) |
      (updated & 0b1011 && someInRange(r0 - 1, r1 + 1, r => context.isNonblankCell(r, c1 + 1)) && 0b0001);
    r0 -= updated & 0b1000 && 1;
    c0 -= updated & 0b0100 && 1;
    r1 += updated & 0b0010 && 1;
    c1 += updated & 0b0001;
  }
  if (r !== r0 || c !== c0 || r !== r1 || c !== c1) {
    return tlbr(r0, c0, r1, c1);
  }
};

const selectCurrentRegionOrAll = updateActiveArea((context, area, activeCell) => {
  const maxRowIndex = context.rowCount - 1;
  const maxColumnIndex = context.columnCount - 1;
  if (area.r0 === 0 && area.c0 === 0 && area.r1 === maxRowIndex && maxColumnIndex) {
    return area;
  }
  const region = currentRegion(context, activeCell);
  return region && !areasEqual(region, area) ? region : tlbr(0, 0, maxRowIndex, maxColumnIndex);
});

const moveActiveCell =
  (
    move: (context: GridContext, cell: GridCell) => GridCell | undefined,
    moveEnd: (context: GridContext, cell: GridCell) => GridCell | undefined,
    extend: (context: GridContext, selection: GridSelection) => GridSelection,
    extendEnd: (context: GridContext, selection: GridSelection) => GridSelection,
  ) =>
  (context: GridContext, selection: GridSelection): GridSelection =>
    selection.extendMode
      ? selection.endMode
        ? extendEnd(context, selection)
        : extend(context, selection)
      : singleCellSelection(
          context,
          (selection.endMode ? moveEnd(context, selection.activeCell) : move(context, selection.activeCell)) ?? selection.activeCell,
        );

export const keyboardShortcuts = () => {
  const map = new Map<`${"C" | "_"}${"A" | "_"}${"S" | "_"}${string}`, (context: GridContext, selection: GridSelection) => GridSelection>();
  map.set("___Escape", (_, selection) => ({ ...selection, extendMode: false }));
  map.set("___F8", (_, selection) => ({ ...selection, extendMode: !selection.extendMode }));
  map.set("___Tab", spiralActiveCellRight);
  map.set("__STab", spiralActiveCellLeft);
  map.set("___Enter", spiralActiveCellDown);
  map.set("__SEnter", spiralActiveCellUp);
  map.set("___ArrowUp", moveActiveCell(moveCellUp, moveEndCellUp, extendSelectionUp, extendEndSelectionUp));
  map.set("___ArrowDown", moveActiveCell(moveCellDown, moveEndCellDown, extendSelectionDown, extendEndSelectionDown));
  map.set("___ArrowLeft", moveActiveCell(moveCellLeft, moveEndCellLeft, extendSelectionLeft, extendEndSelectionLeft));
  map.set("___ArrowRight", moveActiveCell(moveCellRight, moveEndCellRight, extendSelectionRight, extendEndSelectionRight));
  map.set("C__ArrowUp", moveActiveCell(moveEndCellUp, moveEndCellUp, extendEndSelectionUp, extendEndSelectionUp));
  map.set("C__ArrowDown", moveActiveCell(moveEndCellDown, moveEndCellDown, extendEndSelectionDown, extendEndSelectionDown));
  map.set("C__ArrowLeft", moveActiveCell(moveEndCellLeft, moveEndCellLeft, extendEndSelectionLeft, extendEndSelectionLeft));
  map.set("C__ArrowRight", moveActiveCell(moveEndCellRight, moveEndCellRight, extendEndSelectionRight, extendEndSelectionRight));
  map.set("__SArrowUp", (context, selection) =>
    selection.endMode ? extendEndSelectionUp(context, selection) : extendSelectionUp(context, selection),
  );
  map.set("__SArrowDown", (context, selection) =>
    selection.endMode ? extendEndSelectionDown(context, selection) : extendSelectionDown(context, selection),
  );
  map.set("__SArrowLeft", (context, selection) =>
    selection.endMode ? extendEndSelectionLeft(context, selection) : extendSelectionLeft(context, selection),
  );
  map.set("__SArrowRight", (context, selection) =>
    selection.endMode ? extendEndSelectionRight(context, selection) : extendSelectionRight(context, selection),
  );
  map.set("C_SArrowUp", (context, selection) => extendEndSelectionUp(context, selection));
  map.set("C_SArrowDown", (context, selection) => extendEndSelectionDown(context, selection));
  map.set("C_SArrowLeft", (context, selection) => extendEndSelectionLeft(context, selection));
  map.set("C_SArrowRight", (context, selection) => extendEndSelectionRight(context, selection));
  map.set("___Home", (context, selection) => singleCellSelection(context, rc(selection.activeCell.r, 0)));
  map.set("C__Home", context => singleCellSelection(context, rc(0, 0)));
  map.set("___End", (context, { areas, activeCell, extendMode, endMode }) =>
    extendMode
      ? { areas: [tlbr(areas[0]!.r0, activeCell.c, areas[0]!.r1, context.columnCount - 1), ...areas.slice(1)], activeCell, extendMode }
      : { areas, activeCell, endMode: !endMode },
  );
  map.set("C__End", context => singleCellSelection(context, rc(context.rowCount - 1, context.columnCount - 1)));
  map.set(
    "__SHome",
    updateActiveArea((_, area, { c }) => tlbr(area.r0, 0, area.r1, c === area.c0 ? c : area.c1)),
  );
  map.set(
    "C_SHome",
    updateActiveArea((_, area) => tlbr(0, 0, area.r1, area.c1)),
  );
  map.set(
    "C_SEnd",
    updateActiveArea((context, area) => tlbr(area.r0, area.c0, context.rowCount - 1, context.columnCount - 1)),
  );
  map.set("C__.", (_, { areas, areas: [area], activeCell: { r, c } }) => {
    const { r0, c0, r1, c1 } = area!;
    return {
      areas,
      activeCell: r === r0 && c === c0 ? rc(r, c1) : r === r0 && c === c1 ? rc(r1, c) : r === r1 && c === c1 ? rc(r, c0) : rc(r0, c0),
    };
  });
  map.set(
    "C__ ",
    updateActiveArea((context, area) => tlbr(0, area.c0, context.rowCount - 1, area.c1)),
  );
  map.set(
    "__S ",
    updateActiveArea((context, area) => tlbr(area.r0, 0, area.r1, context.columnCount - 1)),
  );
  map.set("C_S ", selectCurrentRegionOrAll);
  map.set("C__a", selectCurrentRegionOrAll);
  map.set(
    "C_S*",
    updateActiveArea((context, area, activeCell) => currentRegion(context, activeCell) ?? area),
  );
  // todo
  // map.set("___PageUp", (_, selection) => selection);
  // map.set("___PageDown", (_, selection) => selection);
  // map.set("_A_PageUp", (_, selection) => selection);
  // map.set("_A_PageDown", (_, selection) => selection);
  // map.set("__SPageUp", (_, selection) => selection);
  // map.set("__SPageDown", (_, selection) => selection);
  // map.set("_ASPageUp", (_, selection) => selection);
  // map.set("_ASPageDown", (_, selection) => selection);
  return map;
};
