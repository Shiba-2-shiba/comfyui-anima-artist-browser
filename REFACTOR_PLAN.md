# Refactor Plan

## Purpose

This document defines the refactoring plan for `Anima Artist Browser` after the current feature set has been treated as the baseline behavior.

The goal is to improve structure, maintainability, and extension safety without changing the current user-visible behavior unless explicitly planned.

## Baseline Behavior To Preserve

The following behavior is treated as the current functional baseline:

- Up to 3 artist slots are managed in a single node.
- The node outputs a single combined artist string.
- The browser UI can apply artists to the active node and target slots.
- Favorites can be stored locally and pinned.
- `After Queue` supports:
  - `Fixed`
  - `Next Artist`
  - `Random Artist`
- `After Queue` works even when `Auto Queue` is `Off`.
- `Random Artist` updates only the number of currently filled slots.
- `Pin Favorites` remains effective for random updates.
- Queue loop behavior remains available through the existing play/stop controls.

## Refactor Scope

### In Scope

- Frontend file structure cleanup
- State management cleanup
- Queue behavior isolation
- Node UI injection cleanup
- Safer extension points for future features
- Verification flow and progress tracking

### Out Of Scope

- Feature redesign
- Visual redesign
- API contract changes unless required by refactor
- Dataset format changes
- Favorites storage format changes unless required by refactor

## Current Problem Areas

### 1. `js/index.js` is overloaded

This file currently mixes:

- node detection
- widget injection
- node layout handling
- queue hook wiring
- queue-related state updates
- browser launch behavior
- runtime timer management

### 2. State is spread across multiple layers

Current state exists across:

- `node.properties`
- `node._currentSlot`
- `node._currentTags`
- browser store state
- localStorage

This makes behavior harder to reason about and increases regression risk.

### 3. Queue behavior is coupled to UI wiring

`After Queue`, `Auto Queue`, and queue loop behavior are currently usable, but the control flow is not well isolated.

### 4. There is no explicit verification workflow

The repository currently lacks:

- automated tests
- structured regression checklist
- explicit refactor checkpoints

## Refactor Strategy

Refactoring should proceed in small, behavior-preserving steps.

The rule is:

- separate one responsibility at a time
- verify behavior after every extraction
- avoid changing logic and structure in the same step when possible

## Implementation Phases

### Phase 0. Freeze Baseline

Objective:

- treat the current feature set as the baseline specification
- document what must not regress

Deliverables:

- this plan
- a manual regression checklist

Exit Criteria:

- the feature baseline is documented
- the first extraction target is agreed

### Phase 1. Extract Queue Behavior

Objective:

- move queue-related logic out of `js/index.js`

Primary targets:

- queue prompt hook
- after-queue advancement
- queue loop bridge points

Expected output:

- new module such as `js/queue_behavior.js`

Exit Criteria:

- `js/index.js` no longer owns queue progression logic
- `After Queue` and `Auto Queue` behavior remains unchanged

### Phase 2. Extract Node UI Wiring

Objective:

- isolate widget creation and widget ordering

Primary targets:

- combo/button widget creation
- tag display widget
- widget reorder logic
- hidden artist widget handling

Expected output:

- new module such as `js/node_ui.js`

Exit Criteria:

- node UI wiring is no longer mixed with queue logic
- widget labels and ordering remain unchanged

### Phase 3. Extract Node Runtime State

Objective:

- isolate node-local runtime concerns

Primary targets:

- resize persistence
- timer handling
- current slot/tag synchronization

Expected output:

- new module such as `js/node_runtime.js`

Exit Criteria:

- `_currentSlot`, `_currentTags`, and runtime timers are managed through a focused layer

### Phase 4. Normalize Browser Boundaries

Objective:

- reduce coupling between browser UI, controller logic, and global singleton state

Primary targets:

- browser bootstrap
- store/controller/view ownership boundaries
- event hookup clarity

Expected output:

- cleaner separation inside `js/browser*.js`

Exit Criteria:

- browser responsibilities are clearer
- adding future UI features no longer requires touching multiple unrelated files

### Phase 5. Verification And Cleanup

Objective:

- remove residual duplication
- document final structure
- add lightweight validation guidance

Deliverables:

- updated architecture notes
- final regression checklist results

Exit Criteria:

- no known dead code remains from the refactor
- the new module layout is documented

## Progress Tracking

Use the following status markers:

- `pending`
- `in_progress`
- `done`
- `blocked`

### Master Status

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 0. Freeze Baseline | done | Baseline behavior and manual regression checklist are documented. |
| Phase 1. Extract Queue Behavior | done | Queue behavior was extracted and queue loop compatibility was manually verified. |
| Phase 2. Extract Node UI Wiring | done | Widget builders, ordering, and tag display were extracted from `js/index.js`. |
| Phase 3. Extract Node Runtime State | done | Resize persistence, timer helpers, and slot/tag runtime state are now managed through `js/node_runtime.js`. |
| Phase 4. Normalize Browser Boundaries | done | Browser bootstrap was extracted and extension points are now documented. |
| Phase 5. Verification And Cleanup | pending | Final pass. |

## Task Breakdown

### Task Group A. Baseline And Verification

- `A1` Document preserved behaviors
  - Status: done
  - Acceptance: baseline features are listed in this file
- `A2` Create manual regression checklist
  - Status: done
  - Acceptance: queue, browser, favorites, and slot operations are checkable step by step
  - Notes: Checklist is available in `MANUAL_REGRESSION_CHECKLIST.md`.

### Task Group B. Queue Extraction

- `B1` Identify all queue-related entry points
  - Status: done
  - Acceptance: queue prompt hook, play/stop flow, and after-queue transitions are mapped
  - Notes: Entry points identified in `js/index.js` (`ensureQueuePromptHook`), `js/autocycle.js` (`start`, `_advance`, status listener), and node widget state reads in `js/queue_settings.js`.
- `B2` Move after-queue update logic into a dedicated module
  - Status: done
  - Acceptance: `js/index.js` no longer owns queue advancement logic
  - Notes: After-queue advancement moved into `js/queue_behavior.js`.
- `B3` Move queue prompt wrapping into the dedicated module
  - Status: done
  - Acceptance: queue submission behavior still works with `Fixed`, `Next Artist`, and `Random Artist`
  - Notes: `app.queuePrompt` wrapping is now initialized through `js/queue_behavior.js`.
- `B4` Verify queue loop compatibility
  - Status: done
  - Acceptance: queue loop behavior matches baseline
  - Notes: Manually verified after the queue extraction changes.

### Task Group C. Node UI Extraction

- `C1` Move combo/button widget builders into a dedicated module
  - Status: done
  - Acceptance: widget creation code is removed from `js/index.js`
  - Notes: Widget creation was extracted into `js/node_ui.js`.
- `C2` Move widget ordering and collapse rules into the same layer
  - Status: done
  - Acceptance: widget ordering remains unchanged after extraction
  - Notes: Widget ordering and hidden artist widget handling now live in `js/node_ui.js`.
- `C3` Move tag display widget rendering into a focused module
  - Status: done
  - Acceptance: slot display remains unchanged
  - Notes: Tag display widget rendering was moved into `js/node_ui.js`.

### Task Group D. Runtime State Extraction

- `D1` Move resize persistence into a dedicated runtime helper
  - Status: done
  - Acceptance: node resize behavior is preserved
  - Notes: Resize persistence helpers were extracted into `js/node_runtime.js`.
- `D2` Move timer scheduling helpers into the runtime layer
  - Status: done
  - Acceptance: layout refresh timing remains unchanged
  - Notes: Timer lifecycle helpers were extracted into `js/node_runtime.js`.
- `D3` Clarify ownership of `_currentSlot` and `_currentTags`
  - Status: done
  - Acceptance: state sync flow is documented and localized
  - Notes: Writes to `_currentSlot` and `_currentTags` are now centralized through runtime helpers in `js/node_runtime.js`.

### Task Group E. Browser Boundary Cleanup

- `E1` Review singleton assumptions in `js/browser.js`
  - Status: done
  - Acceptance: initialization flow is documented
  - Notes: Browser bootstrap, DOM binding, and AutoCycle bridge points were identified as the main singleton responsibilities.
- `E2` Reduce cross-module coupling in browser bootstrap
  - Status: done
  - Acceptance: browser initialization is easier to follow and extend
  - Notes: Browser bootstrap was extracted into `js/browser_bootstrap.js`, and store DOM binding now lives in `js/browser_store.js`.
- `E3` Document intended extension points for future browser features
  - Status: done
  - Acceptance: new browser features can be added without reworking multiple layers
  - Notes: Responsibilities and extension points are documented in `ARCHITECTURE.md`.

### Task Group F. Final Cleanup

- `F1` Remove any dead code introduced by extraction
  - Status: pending
  - Acceptance: no obsolete helper remains
- `F2` Update documentation to reflect the new structure
  - Status: pending
  - Acceptance: file responsibilities are documented
- `F3` Run final manual regression pass
  - Status: pending
  - Acceptance: all baseline behaviors are verified

## Manual Regression Checklist

This checklist should be run after each phase that touches behavior.

### Core Node

- Create the node and confirm it renders correctly.
- Confirm slot summary is visible.
- Confirm selecting artists updates the correct slot.
- Confirm clear resets all slots.

### Browser

- Open browser from node.
- Apply artist normally.
- Apply artist to specific slot.
- Confirm favorites can be added and removed.
- Confirm pinned favorites are respected.

### Queue Behavior

- `After Queue = Fixed`
  - Queue should preserve current slots.
- `After Queue = Next Artist`
  - Queue should submit current slots and then advance for next run.
- `After Queue = Random Artist`
  - Queue should submit current slots and then randomize only the filled slot count.
- Repeat each of the above with `Auto Queue = Off`.
- Repeat each of the above with `Auto Queue = On`.

### Queue Loop

- Start queue loop.
- Confirm play/stop UI updates.
- Confirm loop behavior still advances as expected.
- Confirm stopping exits cleanly.

## Risks

- Queue timing regressions
- Hidden widget serialization regressions
- Node size persistence regressions
- Browser-to-node synchronization regressions

## Working Rules

- Prefer extraction over rewrite.
- Do not change behavior and naming in the same step unless necessary.
- Keep each refactor commit small and reversible.
- Verify the baseline after each phase.

## Next Step

The next implementation step is:

- `F1` Remove any dead code introduced by extraction, then finish the documentation cleanup pass.
