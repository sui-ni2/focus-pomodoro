# Focus Pomodoro

A simple, distraction-free Pomodoro focus timer.

## Status

Initial repository setup.

## Goals

- Keep the focus workflow minimal and fast.
- Make timing and session state clear.
- Avoid unnecessary UI and distractions.
- Keep the project easy to run, review, and extend.

## License

MIT


## Reliable timer behavior

The timer uses a deadline rather than counting interval callbacks. Background
tab throttling does not extend a focus session; the display catches up when
the tab wakes. Pause preserves the remaining time, Reset cancels the previous
deadline, and a focus session is counted only once. Breaks are never counted.

Open `pomodoro.html` directly in a modern browser. No server, account,
network, or dependencies are needed; optional audio may be blocked.

Regression tests (Node.js 20+):

```bash
node --test test/timer.test.mjs
```

GitHub Actions runs the tests on Windows and Ubuntu.
