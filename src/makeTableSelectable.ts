import { MakeTableSelectable, type MakeTableSelectableOptions } from "./MakeTableSelectable/MakeTableSelectable.js";

export const makeTableSelectable = (options: MakeTableSelectableOptions<HTMLTableCellElement>) =>
  new MakeTableSelectable({
    onActiveCellChanged: selectable => {
      selectable.activeCellElement?.scrollIntoView({ block: "nearest" });
      options.onActiveCellChanged?.(selectable);
    },
    ...options,
  });
