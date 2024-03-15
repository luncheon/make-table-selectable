import { MakeTableSelectable, type MakeTableSelectableOptions } from "./MakeTableSelectable/MakeTableSelectable.js";
import { renderer } from "./renderer.js";

export const makeTableSelectable = (
  options: Omit<MakeTableSelectableOptions<HTMLTableCellElement>, "render" | "signal"> & { readonly signal?: AbortSignal },
) => {
  const signal = options.signal ?? new AbortController().signal;
  return new MakeTableSelectable({
    signal,
    render: renderer(signal, options.context),
    onActiveCellChanged: selectable => {
      selectable.activeCellElement?.scrollIntoView({ block: "nearest" });
      options.onActiveCellChanged?.(selectable);
    },
    ...options,
  });
};
