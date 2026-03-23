# Architecture Notes

## Frontend Module Roles

### Node-side modules

- `js/index.js`
  - ComfyUI extension entry point.
  - Detects target nodes, applies node patching, and wires startup hooks.
- `js/queue_behavior.js`
  - Handles `queuePrompt` wrapping and after-queue artist progression.
- `js/node_ui.js`
  - Owns node widget creation, widget ordering, tag display, and browser launch button wiring.
- `js/node_runtime.js`
  - Owns node-local runtime concerns:
  - size persistence
  - runtime timers
  - `_currentSlot` / `_currentTags` writes
- `js/utils.js`
  - Owns artist widget read/write helpers and prompt-side slot application logic.

### Browser-side modules

- `js/browser.js`
  - Composition root for the browser singleton.
  - Creates store, controller, view, and bootstrap objects.
- `js/browser_bootstrap.js`
  - Builds or rebinds the browser DOM.
  - Attaches browser events.
  - Bridges `AutoCycle` updates back into the active browser instance.
- `js/browser_store.js`
  - Owns browser state shape and persistent category selection.
  - Binds DOM element references into the store.
- `js/browser_controller.js`
  - Owns local token flow and favorite mutation/loading logic.
- `js/browser_view.js`
  - Owns rendering, slot summary refresh, highlight state, and swipe entry points.

## Browser Extension Points

- Add new browser controls in `js/browser_template.js`, then wire behavior in `js/browser_events.js`.
- Add new store-only UI state in `js/browser_store.js`.
- Add new API-backed behaviors in `js/browser_controller.js`.
- Add new render flows or card interactions in `js/browser_view.js`.
- Add startup-only wiring, DOM bootstrap, or cross-module bridges in `js/browser_bootstrap.js`.

## Node Extension Points

- Add queue-related behaviors in `js/queue_behavior.js`.
- Add node widget/UI changes in `js/node_ui.js`.
- Add node-local runtime behaviors in `js/node_runtime.js`.
- Add artist slot application rules in `js/utils.js` and `js/slot_state.js`.
