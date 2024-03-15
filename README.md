# make-table-selectable

Emulate Excel cell selection behavior for `<table>`.

This tiny package does:

- Not render `<table>`. You are responsible for rendering the `<table>` yourself.
- Not modify `<table>` itself in any way.
- Overlay an element representing the selection state.
- Support keyboard, pointer and touch events.
- Support selecting multiple areas.
- Support selecting merged cells (having `rowspan` or `colspan`).
