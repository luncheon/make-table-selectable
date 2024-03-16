// src/MakeTableSelectable/util.ts
var rc = (r, c) => ({ r, c });
var tlbr = (r0, c0, r1, c1) => ({ r0, c0, r1, c1 });
var singleCellSelection = (context, activeCell) => ({
  areas: [context.getCellArea(activeCell.r, activeCell.c)],
  activeCell
});
var areasEqual = (a, b) => a === b || a.r0 === b.r0 && a.r1 === b.r1 && a.c0 === b.c0 && a.c1 === b.c1;
var areaContainsCell = (area, { r, c }) => r >= area.r0 && r <= area.r1 && c >= area.c0 && c <= area.c1;
var isTouchEvent = (e) => e.pointerType === "touch" || e.pointerType === "pen";
var handleDrag = (onMove, onEnd) => {
  const abortController = new AbortController();
  const abort = (e) => {
    abortController.abort();
    onEnd?.(e);
  };
  const signal = abortController.signal;
  const listenerOptions = { signal, capture: true };
  addEventListener("pointerdown", abort, listenerOptions);
  addEventListener("pointerup", abort, listenerOptions);
  addEventListener("pointercancel", abort, listenerOptions);
  addEventListener("pointermove", onMove, listenerOptions);
};
var mergeArea = (a, b) => {
  a.r0 = Math.min(a.r0, b.r0);
  a.c0 = Math.min(a.c0, b.c0);
  a.r1 = Math.max(a.r1, b.r1);
  a.c1 = Math.max(a.c1, b.c1);
  return a;
};
var normalizeExtendedArea = (context, area) => {
  const newArea = area;
  do {
    area = { ...newArea };
    for (let r = newArea.r0; r <= newArea.r1; r++) {
      mergeArea(newArea, context.getCellArea(r, newArea.c0));
      mergeArea(newArea, context.getCellArea(r, newArea.c1));
    }
    for (let c = newArea.c0; c <= newArea.c1; c++) {
      mergeArea(newArea, context.getCellArea(newArea.r0, c));
      mergeArea(newArea, context.getCellArea(newArea.r1, c));
    }
  } while (!areasEqual(area, newArea) && newArea.r0 > 0 && newArea.c0 > 0 && newArea.r1 < context.rowCount - 1 && newArea.c1 < context.columnCount - 1);
  return newArea;
};
var enclosingArea = (context, a, b) => normalizeExtendedArea(context, tlbr(Math.min(a.r0, b.r0), Math.min(a.c0, b.c0), Math.max(a.r1, b.r1), Math.max(a.c1, b.c1)));

// src/MakeTableSelectable/handlePointerEvents.ts
var handlePointerEvents = (signal, context, getSelection, setSelection) => (
  // todo: select entire row or column on pointer events on <th>
  context.rootElement.addEventListener(
    "pointerdown",
    (e) => {
      if (isTouchEvent(e)) {
        return;
      }
      let activeCellArea = context.getCellAreaFromPoint(e);
      let previousPointedCellArea = activeCellArea;
      if (!activeCellArea) {
        return;
      }
      e.button === 0 && e.preventDefault();
      let selection = getSelection();
      if (!selection || (e.ctrlKey || e.metaKey) === e.shiftKey) {
        selection = { areas: [activeCellArea], activeCell: rc(activeCellArea.r0, activeCellArea.c0) };
      } else if (e.shiftKey) {
        selection = {
          areas: [
            enclosingArea(context, activeCellArea, activeCellArea = context.getCellArea(selection.activeCell.r, selection.activeCell.c)),
            ...selection.areas.slice(1)
          ],
          activeCell: selection.activeCell
        };
      } else if (selection.areas.some((area) => areaContainsCell(area, rc(activeCellArea.r0, activeCellArea.c0)))) {
        return;
      } else {
        selection = { areas: [activeCellArea, ...selection.areas], activeCell: rc(activeCellArea.r0, activeCellArea.c0) };
      }
      setSelection(selection);
      handleDrag((e2) => {
        const area = context.getCellAreaFromPoint(e2);
        area && !areasEqual(area, previousPointedCellArea) && setSelection({
          areas: [enclosingArea(context, activeCellArea, previousPointedCellArea = area), ...selection.areas.slice(1)],
          activeCell: selection.activeCell
        });
      });
    },
    { signal }
  )
);

// src/MakeTableSelectable/handleTouchEvents.ts
var touchHandleContainerStyles = {
  position: "absolute",
  inset: "0",
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  touchAction: "none"
};
var handleTouchEvents = (signal, context, setSelection) => {
  let selection;
  const touchHandleContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.assign(touchHandleContainer.style, touchHandleContainerStyles);
  touchHandleContainer.innerHTML = '<g stroke-width=1.5 stroke="rgb(0,128,255)" fill=white><circle r=6 /><circle r=6 /></g><g fill=transparent pointer-events=fill><circle r=12 /><circle r=12 /></g>';
  const [g1, g2] = touchHandleContainer.children;
  const [tlHandle, brHandle] = g1.children;
  const [tlMargin, brMargin] = g2.children;
  const hideTouchHandle = () => touchHandleContainer.remove();
  const _setSelection = (area, activeCell) => {
    setSelection(selection = { areas: [area], activeCell: activeCell ?? rc(area.r0, area.c0) });
    const rect = context.getAreaRect(area);
    tlHandle.cx.baseVal.value = tlMargin.cx.baseVal.value = rect.x;
    tlHandle.cy.baseVal.value = tlMargin.cy.baseVal.value = rect.y;
    brHandle.cx.baseVal.value = brMargin.cx.baseVal.value = rect.x + rect.w;
    brHandle.cy.baseVal.value = brMargin.cy.baseVal.value = rect.y + rect.h;
  };
  signal.addEventListener("abort", hideTouchHandle, { once: true });
  addEventListener("keydown", ({ key }) => key !== "Control" && key !== "Meta" && key !== "Alt" && key !== "Shift" && hideTouchHandle(), {
    signal
  });
  context.rootElement.addEventListener(
    "pointerup",
    (e) => {
      if (isTouchEvent(e)) {
        const area = context.getCellAreaFromPoint(e);
        if (area) {
          _setSelection(area);
          e.currentTarget.parentElement.append(touchHandleContainer);
        }
      } else {
        hideTouchHandle();
      }
    },
    { signal }
  );
  g2.addEventListener("pointerdown", (e) => {
    if (selection && isTouchEvent(e)) {
      const activeCellArea = context.getCellArea(selection.activeCell.r, selection.activeCell.c);
      let previousPointedCellArea;
      handleDrag(
        (e2) => {
          const area = context.getCellAreaFromPoint(e2);
          area && !(previousPointedCellArea && areasEqual(area, previousPointedCellArea)) && _setSelection(enclosingArea(context, activeCellArea, previousPointedCellArea = area), selection.activeCell);
        },
        () => _setSelection(selection.areas[0])
      );
    } else {
      hideTouchHandle();
    }
  });
};

// src/MakeTableSelectable/keyboardShortcuts.ts
var someInRange = (lower, upper, predicate) => {
  for (let i = lower; i <= upper; i++) {
    if (predicate(i)) {
      return 1;
    }
  }
  return 0;
};
var minInRange = (lower, upper, selector) => {
  let min = selector(lower);
  for (let i = lower + 1; i <= upper; i++) {
    min = Math.min(min, selector(i));
  }
  return min;
};
var maxInRange = (lower, upper, selector) => {
  let max = selector(lower);
  for (let i = lower + 1; i <= upper; i++) {
    max = Math.max(max, selector(i));
  }
  return max;
};
var updateActiveArea = (callback) => (context, selection) => {
  const areas = selection.areas;
  const activeCell = selection.activeCell;
  const area = callback(context, areas[0], activeCell);
  return area === areas[0] ? selection : { areas: areas.length === 1 ? [area] : [area, ...areas.slice(1)], activeCell, extendMode: selection.extendMode };
};
var updatePartialSelection = (callback) => (context, selection) => ({ ...selection, ...callback(context, selection) });
var moveCellUp = (context, cell) => {
  const r0 = context.getCellArea(cell.r, cell.c).r0;
  return r0 ? rc(r0 - 1, cell.c) : void 0;
};
var moveCellDown = (context, cell) => {
  const r1 = context.getCellArea(cell.r, cell.c).r1;
  return r1 < context.rowCount - 1 ? rc(r1 + 1, cell.c) : void 0;
};
var moveCellLeft = (context, cell) => {
  const c0 = context.getCellArea(cell.r, cell.c).c0;
  return c0 ? rc(cell.r, c0 - 1) : void 0;
};
var moveCellRight = (context, cell) => {
  const c1 = context.getCellArea(cell.r, cell.c).c1;
  return c1 < context.columnCount - 1 ? rc(cell.r, c1 + 1) : void 0;
};
var spiralCellUpInArea = ({ r, c }, a) => r > a.r0 ? rc(r - 1, c) : rc(a.r1, c > a.c0 ? c - 1 : a.c1);
var spiralCellDownInArea = ({ r, c }, a) => r < a.r1 ? rc(r + 1, c) : rc(a.r0, c < a.c1 ? c + 1 : a.c0);
var spiralCellLeftInArea = ({ r, c }, a) => c > a.c0 ? rc(r, c - 1) : rc(r > a.r0 ? r - 1 : a.r1, a.c1);
var spiralCellRightInArea = ({ r, c }, a) => c < a.c1 ? rc(r, c + 1) : rc(r < a.r1 ? r + 1 : a.r0, a.c0);
var spiralActiveCellUp = updatePartialSelection((context, { areas, activeCell }) => {
  const area = areas[0];
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (areas.length !== 1 && activeCellArea.r0 === area.r0 && activeCellArea.c0 === area.c0) {
    const nextArea = areas.at(-1);
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
var spiralActiveCellDown = updatePartialSelection((context, { areas, activeCell }) => {
  const area = areas[0];
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (areas.length !== 1 && activeCellArea.r1 === area.r1 && activeCellArea.c1 === area.c1) {
    return { areas: [...areas.slice(1), area], activeCell: rc(areas[1].r0, areas[1].c0) };
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
var spiralActiveCellLeft = updatePartialSelection((context, { areas, activeCell }) => {
  const area = areas[0];
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (areas.length !== 1 && activeCellArea.r0 === area.r0 && activeCellArea.c0 === area.c0) {
    const nextArea = areas.at(-1);
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
var spiralActiveCellRight = updatePartialSelection((context, { areas, activeCell }) => {
  const area = areas[0];
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (areas.length !== 1 && activeCellArea.r1 === area.r1 && activeCellArea.c1 === area.c1) {
    return { areas: [...areas.slice(1), area], activeCell: rc(areas[1].r0, areas[1].c0) };
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
var extendSelectionUp = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.r0 === activeCellArea.r0 && area.r1 !== activeCellArea.r1) {
    let r1 = area.r1 - 1;
    for (let prev = r1; prev !== (r1 = minInRange(area.c0, area.c1, (c) => context.getCellArea(r1 + 1, c).r0) - 1); prev = r1)
      ;
    const newArea = normalizeExtendedArea(context, { ...area, r1 });
    if (!areasEqual(newArea, area) && areaContainsCell(newArea, activeCell)) {
      return newArea;
    }
  }
  return area.r0 ? normalizeExtendedArea(context, { ...area, r0: area.r0 - 1 }) : area;
});
var extendSelectionDown = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.r1 === activeCellArea.r1 && area.r0 !== activeCellArea.r0) {
    let r0 = area.r0 + 1;
    for (let prev = r0; prev !== (r0 = maxInRange(area.c0, area.c1, (c) => context.getCellArea(r0 - 1, c).r1) + 1); prev = r0)
      ;
    const newArea = normalizeExtendedArea(context, { ...area, r0 });
    if (!areasEqual(newArea, area) && areaContainsCell(newArea, activeCell)) {
      return newArea;
    }
  }
  return area.r1 < context.rowCount - 1 ? normalizeExtendedArea(context, { ...area, r1: area.r1 + 1 }) : area;
});
var extendSelectionLeft = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.c0 === activeCellArea.c0 && area.c1 !== activeCellArea.c1) {
    let c1 = area.c1 - 1;
    for (let prev = c1; prev !== (c1 = minInRange(area.r0, area.r1, (r) => context.getCellArea(r, c1 + 1).c0) - 1); prev = c1)
      ;
    const newArea = normalizeExtendedArea(context, { ...area, c1 });
    if (!areasEqual(newArea, area) && areaContainsCell(newArea, activeCell)) {
      return newArea;
    }
  }
  return area.c0 ? normalizeExtendedArea(context, { ...area, c0: area.c0 - 1 }) : area;
});
var extendSelectionRight = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.c1 === activeCellArea.c1 && area.c0 !== activeCellArea.c0) {
    let c0 = area.c0 + 1;
    for (let prev = c0; prev !== (c0 = minInRange(area.r0, area.r1, (r) => context.getCellArea(r, c0 - 1).c1) + 1); prev = c0)
      ;
    const newArea = normalizeExtendedArea(context, { ...area, c0 });
    if (!areasEqual(newArea, area) && areaContainsCell(newArea, activeCell)) {
      return newArea;
    }
  }
  return area.c1 < context.columnCount - 1 ? normalizeExtendedArea(context, { ...area, c1: area.c1 + 1 }) : area;
});
var moveEndCellUp = (context, cell) => {
  let { r0: r, c0: c } = context.getCellArea(cell.r, cell.c);
  if (r) {
    if (context.isNonblankCell(r, c) && context.isNonblankCell(r - 1, c)) {
      while (--r && context.isNonblankCell(r - 1, c))
        ;
    } else {
      while (--r && !context.isNonblankCell(r, c))
        ;
    }
    return rc(r, c);
  }
};
var moveEndCellDown = (context, cell) => {
  let { r1: r, c1: c } = context.getCellArea(cell.r, cell.c);
  const maxRowIndex = context.rowCount - 1;
  if (r < maxRowIndex) {
    if (context.isNonblankCell(r, c) && context.isNonblankCell(r + 1, c)) {
      while (++r < maxRowIndex && context.isNonblankCell(r + 1, c))
        ;
    } else {
      while (++r < maxRowIndex && !context.isNonblankCell(r, c))
        ;
    }
    return rc(r, c);
  }
};
var moveEndCellLeft = (context, cell) => {
  let { r0: r, c0: c } = context.getCellArea(cell.r, cell.c);
  if (c) {
    if (context.isNonblankCell(r, c) && context.isNonblankCell(r, c - 1)) {
      while (--c && context.isNonblankCell(r, c - 1))
        ;
    } else {
      while (--c && !context.isNonblankCell(r, c))
        ;
    }
    return rc(r, c);
  }
};
var moveEndCellRight = (context, cell) => {
  let { r0: r, c1: c } = context.getCellArea(cell.r, cell.c);
  const maxColumnIndex = context.columnCount - 1;
  if (c < maxColumnIndex) {
    if (context.isNonblankCell(r, c) && context.isNonblankCell(r, c + 1)) {
      while (++c < maxColumnIndex && context.isNonblankCell(r, c + 1))
        ;
    } else {
      while (++c < maxColumnIndex && !context.isNonblankCell(r, c))
        ;
    }
    return rc(r, c);
  }
};
var extendEndSelectionUp = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.r0 === activeCellArea.r0 && area.r1 !== activeCellArea.r1) {
    const r = moveEndCellUp(context, rc(area.r1, activeCellArea.c0))?.r;
    if (r !== void 0) {
      return normalizeExtendedArea(context, { ...area, r0: Math.min(area.r0, r), r1: Math.max(area.r0, r) });
    }
  }
  const r0 = moveEndCellUp(context, rc(area.r0, activeCellArea.c0))?.r;
  return r0 !== void 0 ? normalizeExtendedArea(context, { ...area, r0 }) : area;
});
var extendEndSelectionDown = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.r1 === activeCellArea.r1 && area.r0 !== activeCellArea.r0) {
    const r = moveEndCellDown(context, rc(area.r0, activeCellArea.c0))?.r;
    if (r !== void 0) {
      return normalizeExtendedArea(context, { ...area, r0: Math.min(area.r1, r), r1: Math.max(area.r1, r) });
    }
  }
  const r1 = moveEndCellDown(context, rc(area.r1, activeCellArea.c0))?.r;
  return r1 !== void 0 ? normalizeExtendedArea(context, { ...area, r1 }) : area;
});
var extendEndSelectionLeft = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.c0 === activeCellArea.c0 && area.c1 !== activeCellArea.c1) {
    const c = moveEndCellLeft(context, rc(activeCellArea.r0, area.c1))?.c;
    if (c !== void 0) {
      return normalizeExtendedArea(context, { ...area, c0: Math.min(area.c0, c), c1: Math.max(area.c0, c) });
    }
  }
  const c0 = moveEndCellLeft(context, rc(activeCellArea.r0, area.c0))?.c;
  return c0 !== void 0 ? normalizeExtendedArea(context, { ...area, c0 }) : area;
});
var extendEndSelectionRight = updateActiveArea((context, area, activeCell) => {
  const activeCellArea = context.getCellArea(activeCell.r, activeCell.c);
  if (area.c1 === activeCellArea.c1 && area.c0 !== activeCellArea.c0) {
    const c = moveEndCellRight(context, rc(activeCellArea.r0, area.c0))?.c;
    if (c !== void 0) {
      return normalizeExtendedArea(context, { ...area, c0: Math.min(area.c1, c), c1: Math.max(area.c1, c) });
    }
  }
  const c1 = moveEndCellRight(context, rc(activeCellArea.r0, area.c1))?.c;
  return c1 !== void 0 ? normalizeExtendedArea(context, { ...area, c1 }) : area;
});
var currentRegion = (context, { r, c, r: r0, c: c0, r: r1, c: c1 }) => {
  for (let updated = 15; updated; ) {
    updated = (updated & 13 && someInRange(c0 - 1, c1 + 1, (c2) => context.isNonblankCell(r0 - 1, c2)) && 8) | (updated & 14 && someInRange(r0 - 1, r1 + 1, (r2) => context.isNonblankCell(r2, c0 - 1)) && 4) | (updated & 7 && someInRange(c0 - 1, c1 + 1, (c2) => context.isNonblankCell(r1 + 1, c2)) && 2) | (updated & 11 && someInRange(r0 - 1, r1 + 1, (r2) => context.isNonblankCell(r2, c1 + 1)) && 1);
    r0 -= updated & 8 && 1;
    c0 -= updated & 4 && 1;
    r1 += updated & 2 && 1;
    c1 += updated & 1;
  }
  if (r !== r0 || c !== c0 || r !== r1 || c !== c1) {
    return tlbr(r0, c0, r1, c1);
  }
};
var selectCurrentRegionOrAll = updateActiveArea((context, area, activeCell) => {
  const maxRowIndex = context.rowCount - 1;
  const maxColumnIndex = context.columnCount - 1;
  if (area.r0 === 0 && area.c0 === 0 && area.r1 === maxRowIndex && maxColumnIndex) {
    return area;
  }
  const region = currentRegion(context, activeCell);
  return region && !areasEqual(region, area) ? region : tlbr(0, 0, maxRowIndex, maxColumnIndex);
});
var moveActiveCell = (move, moveEnd, extend, extendEnd) => (context, selection) => selection.extendMode ? selection.endMode ? extendEnd(context, selection) : extend(context, selection) : singleCellSelection(
  context,
  (selection.endMode ? moveEnd(context, selection.activeCell) : move(context, selection.activeCell)) ?? selection.activeCell
);
var keyboardShortcuts = () => {
  const map = /* @__PURE__ */ new Map();
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
  map.set(
    "__SArrowUp",
    (context, selection) => selection.endMode ? extendEndSelectionUp(context, selection) : extendSelectionUp(context, selection)
  );
  map.set(
    "__SArrowDown",
    (context, selection) => selection.endMode ? extendEndSelectionDown(context, selection) : extendSelectionDown(context, selection)
  );
  map.set(
    "__SArrowLeft",
    (context, selection) => selection.endMode ? extendEndSelectionLeft(context, selection) : extendSelectionLeft(context, selection)
  );
  map.set(
    "__SArrowRight",
    (context, selection) => selection.endMode ? extendEndSelectionRight(context, selection) : extendSelectionRight(context, selection)
  );
  map.set("C_SArrowUp", (context, selection) => extendEndSelectionUp(context, selection));
  map.set("C_SArrowDown", (context, selection) => extendEndSelectionDown(context, selection));
  map.set("C_SArrowLeft", (context, selection) => extendEndSelectionLeft(context, selection));
  map.set("C_SArrowRight", (context, selection) => extendEndSelectionRight(context, selection));
  map.set("___Home", (context, selection) => singleCellSelection(context, rc(selection.activeCell.r, 0)));
  map.set("C__Home", (context) => singleCellSelection(context, rc(0, 0)));
  map.set(
    "___End",
    (context, { areas, activeCell, extendMode, endMode }) => extendMode ? { areas: [tlbr(areas[0].r0, activeCell.c, areas[0].r1, context.columnCount - 1), ...areas.slice(1)], activeCell, extendMode } : { areas, activeCell, endMode: !endMode }
  );
  map.set("C__End", (context) => singleCellSelection(context, rc(context.rowCount - 1, context.columnCount - 1)));
  map.set(
    "__SHome",
    updateActiveArea((_, area, { c }) => tlbr(area.r0, 0, area.r1, c === area.c0 ? c : area.c1))
  );
  map.set(
    "C_SHome",
    updateActiveArea((_, area) => tlbr(0, 0, area.r1, area.c1))
  );
  map.set(
    "C_SEnd",
    updateActiveArea((context, area) => tlbr(area.r0, area.c0, context.rowCount - 1, context.columnCount - 1))
  );
  map.set("C__.", (_, { areas, areas: [area], activeCell: { r, c } }) => {
    const { r0, c0, r1, c1 } = area;
    return {
      areas,
      activeCell: r === r0 && c === c0 ? rc(r, c1) : r === r0 && c === c1 ? rc(r1, c) : r === r1 && c === c1 ? rc(r, c0) : rc(r0, c0)
    };
  });
  map.set(
    "C__ ",
    updateActiveArea((context, area) => tlbr(0, area.c0, context.rowCount - 1, area.c1))
  );
  map.set(
    "__S ",
    updateActiveArea((context, area) => tlbr(area.r0, 0, area.r1, context.columnCount - 1))
  );
  map.set("C_S ", selectCurrentRegionOrAll);
  map.set("C__a", selectCurrentRegionOrAll);
  map.set(
    "C_S*",
    updateActiveArea((context, area, activeCell) => currentRegion(context, activeCell) ?? area)
  );
  return map;
};

// src/MakeTableSelectable/MakeTableSelectable.ts
var SelectedRow = class {
  #context;
  #r;
  #c;
  #cs;
  constructor(context, r, c, cs) {
    this.#context = context;
    this.#r = r;
    this.#c = c;
    this.#cs = cs;
  }
  get rowIndex() {
    return this.#r;
  }
  #cellsCache;
  #cells() {
    return Array.from({ length: this.#cs }, (_, c) => this.#context.getCellElement(this.#r, this.#c + c));
  }
  get cells() {
    return this.#cellsCache ??= this.#cells();
  }
};
var SelectedArea = class {
  #context;
  #area;
  constructor(context, area) {
    this.#context = context;
    this.#area = area;
  }
  #rowsCache;
  #rows() {
    const area = this.#area;
    return Array.from(
      { length: area.r1 - area.r0 + 1 },
      (_, r) => new SelectedRow(this.#context, area.r0 + r, area.c0, area.c1 - area.c0 + 1)
    );
  }
  get rows() {
    return this.#rowsCache ??= this.#rows();
  }
};
var MakeTableSelectable = class {
  constructor(options) {
    this.options = options;
    const signal = this.#destroyController.signal;
    const context = options.context;
    const setSelection = (selection) => this.#setSelection(selection);
    this.render();
    (options.keyboardEventTarget ?? context.rootElement).addEventListener("keydown", (e) => this.keydown(e) && e.preventDefault(), {
      signal
    });
    handlePointerEvents(signal, context, () => this.#selection, setSelection);
    handleTouchEvents(signal, context, setSelection);
  }
  keyboardShortcuts = keyboardShortcuts();
  #destroyController = new AbortController();
  #selection;
  get activeCellAddress() {
    return this.#selection?.activeCell;
  }
  get activeCellElement() {
    const a = this.#selection?.activeCell;
    return a && this.options.context.getCellElement(a.r, a.c);
  }
  #selectedAreasCache;
  #selectedAreas() {
    return this.#selection?.areas.map((area) => new SelectedArea(this.options.context, area)) ?? [];
  }
  get selectedAreas() {
    return this.#selectedAreasCache ??= this.#selectedAreas();
  }
  get endMode() {
    return this.#selection?.endMode;
  }
  get expandMode() {
    return this.#selection?.extendMode;
  }
  destroy() {
    this.#destroyController.abort();
    this.options.renderer.destroy();
  }
  render() {
    this.options.renderer.render(this.options.context, this.#selection);
  }
  keydown(e) {
    const selection = this.#selection;
    const handler = selection && this.keyboardShortcuts.get(`${e.ctrlKey || e.metaKey ? "C" : "_"}${e.altKey ? "A" : "_"}${e.shiftKey ? "S" : "_"}${e.key}`);
    handler && this.#setSelection(handler(this.options.context, selection));
    return !!handler;
  }
  #setSelection(newSelection) {
    const oldSelection = this.#selection;
    if (oldSelection === newSelection) {
      return;
    }
    const oldActiveCell = oldSelection?.activeCell;
    const newActiveCell = newSelection?.activeCell;
    const activeCellChanged = oldActiveCell?.r !== newActiveCell?.r || oldActiveCell?.c !== newActiveCell?.c;
    const oldAreas = oldSelection?.areas;
    const newAreas = newSelection?.areas;
    const selectionChanged = oldAreas?.length !== newAreas?.length || oldAreas?.some((oldArea, i) => !areasEqual(oldArea, newAreas[i]));
    this.#selection = newSelection;
    if (activeCellChanged || selectionChanged) {
      this.#selectedAreasCache = void 0;
      this.render();
      activeCellChanged && this.options.onActiveCellChanged?.(this);
      selectionChanged && this.options.onSelectionChanged?.(this);
    }
    if (oldSelection?.extendMode !== newSelection?.extendMode || oldSelection?.endMode !== newSelection?.endMode) {
      this.options.onModeChanged?.(this);
    }
  }
};

// src/makeTableSelectable.ts
var makeTableSelectable = (options) => new MakeTableSelectable({
  onActiveCellChanged: (selectable) => {
    selectable.activeCellElement?.scrollIntoView({ block: "nearest" });
    options.onActiveCellChanged?.(selectable);
  },
  ...options
});

// node_modules/despan/index.js
function despan(table) {
  const rows = [];
  let ri = 0;
  for (const row of table.rows) {
    const cells = rows[ri] ??= [];
    let ci = 0;
    for (const cell of row.cells) {
      while (cells[ci])
        ci++;
      for (let ro = 0; ro < cell.rowSpan; ro++) {
        const cells2 = rows[ri + ro] ??= [];
        for (let co = 0; co < cell.colSpan; co++) {
          cells2[ci + co] = cell;
        }
      }
      ci += cell.colSpan;
    }
    while (rows[++ri]?.length === cells.length && Array.from(rows[ri]).every(Boolean))
      ;
  }
  return rows;
}

// src/MergeableTableGridContext.ts
var MergeableTableGridContext = class {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.refresh();
  }
  #rows;
  #cellAreaMap;
  get rowCount() {
    return this.#rows.length;
  }
  get columnCount() {
    return this.#rows[0]?.length ?? 0;
  }
  refresh() {
    const rows = despan(this.rootElement);
    const cellAreaMap = /* @__PURE__ */ new WeakMap();
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r];
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
  getCellElement(r, c) {
    return this.#rows[r]?.[c];
  }
  isNonblankCell(r, c) {
    return !!this.#rows[r]?.[c]?.textContent;
  }
  getCellArea(r, c) {
    return this.#cellAreaMap.get(this.#rows[r]?.[c]);
  }
  getAreaRect(area) {
    const rows = this.#rows;
    const tl = rows[area.r0][area.c0];
    const br = rows[area.r1][area.c1];
    const { offsetLeft: x, offsetTop: y } = tl;
    return { x, y, w: br.offsetLeft + br.offsetWidth - x, h: br.offsetTop + br.offsetHeight - y };
  }
  getCellAreaFromPoint(p) {
    const root = this.rootElement;
    const td = document.elementsFromPoint(p.clientX, p.clientY).find((el) => el instanceof HTMLTableCellElement && (el.parentElement === root || el.parentElement?.parentElement === root));
    return td && this.#cellAreaMap.get(td);
  }
};

// src/DefaultRenderer.ts
var overlayStyleBase = {
  boxSizing: "border-box",
  pointerEvents: "none",
  position: "absolute",
  border: "0 solid rgba(0, 128, 255, 0.2)",
  outline: "auto 2px rgb(0, 128, 255)",
  outlineOffset: "-1px",
  background: "rgba(128, 224, 255, 0.2)"
  // transitionProperty: "left,top,width,height,border-width",
  // transitionDuration: "64ms",
  // transitionTimingFunction: "linear",
};
var h = (tagName, style) => {
  const overlay = document.createElement(tagName);
  Object.assign(overlay.style, style);
  return overlay;
};
var DefaultRenderer = class {
  #overlayContainer;
  destroy() {
    this.#overlayContainer?.remove();
  }
  render(context, selection) {
    const overlayContainer = this.#overlayContainer ??= context.rootElement.parentElement.appendChild(document.createElement("div"));
    if (!selection) {
      overlayContainer.innerHTML = "";
      return;
    }
    const areas = selection.areas;
    while (overlayContainer.children.length > areas.length) {
      overlayContainer.lastElementChild.remove();
    }
    let overlay = overlayContainer.firstElementChild;
    for (let i = 0; i < areas.length; i++) {
      const rect = context.getAreaRect(areas[i]);
      const overlayStyle = (overlay ??= overlayContainer.appendChild(h("div", overlayStyleBase))).style;
      overlayStyle.left = `${rect.x}px`;
      overlayStyle.top = `${rect.y}px`;
      overlayStyle.width = `${rect.w}px`;
      overlayStyle.height = `${rect.h}px`;
      if (i === 0) {
        const activeCell = selection.activeCell;
        const activeRect = context.getAreaRect(context.getCellArea(activeCell.r, activeCell.c));
        overlayStyle.borderWidth = `${activeRect.y - rect.y}px ${rect.x + rect.w - activeRect.x - activeRect.w}px ${rect.y + rect.h - activeRect.y - activeRect.h}px ${activeRect.x - rect.x}px`;
      } else {
        overlayStyle.borderWidth = `${rect.h / 2}px ${rect.w / 2}px`;
      }
      overlay = overlay.nextElementSibling;
    }
  }
};
export {
  DefaultRenderer,
  MergeableTableGridContext,
  makeTableSelectable
};
