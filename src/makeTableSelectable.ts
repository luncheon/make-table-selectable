import { MakeTableSelectable, type MakeTableSelectableOptions } from "./MakeTableSelectable/MakeTableSelectable.js";
import { SelectionRenderer, type SelectionRendererAppearance } from "./SelectionRenderer.js";

export const makeTableSelectable = (
  options: Omit<MakeTableSelectableOptions<HTMLTableCellElement>, "renderer"> & { readonly appearance: SelectionRendererAppearance },
) =>
  new MakeTableSelectable({
    renderer: new SelectionRenderer(options.appearance),
    onActiveCellChanged: selectable => {
      selectable.activeCellElement?.scrollIntoView({ block: "nearest" });
      options.onActiveCellChanged?.(selectable);
    },
    ...options,
  });
