# Manual Regression Checklist

Run this checklist after each refactor phase that changes behavior.

## Core Node

- Create the node and confirm it renders correctly.
- Confirm slot summary is visible.
- Confirm selecting artists updates the correct slot.
- Confirm clear resets all slots.

## Browser

- Open browser from node.
- Apply artist normally.
- Apply artist to specific slot.
- Confirm favorites can be added and removed.
- Confirm pinned favorites are respected.

## Queue Behavior

- `After Queue = Fixed`
  - Queue should preserve current slots.
- `After Queue = Next Artist`
  - Queue should submit current slots and then advance for next run.
- `After Queue = Random Artist`
  - Queue should submit current slots and then randomize only the filled slot count.
- `After Queue = Favorite Random`
  - Queue should submit current slots and then randomize only from favorited artists.
- Repeat each of the above with `Auto Queue = Off`.
- Repeat each of the above with `Auto Queue = On`.

## Queue Loop

- Start queue loop.
- Confirm play/stop UI updates.
- Confirm loop behavior still advances as expected.
- Confirm stopping exits cleanly.
