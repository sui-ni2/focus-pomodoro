import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(path.join(root, "pomodoro.html"), "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "inline offline-compatible timer script must exist");

function harness() {
  let now = 0, nextId = 1;
  const timers = new Map();
  const elements = Object.fromEntries(
    ["time", "mode", "prog", "toggle", "count", "reset"].map(id => [id, { textContent: "", style: {}, onclick: null }])
  );
  const tabs = [25, 5, 15].map(minutes => ({
    dataset: { min: String(minutes) },
    classList: { add() {}, remove() {} },
    onclick: null,
  }));
  const document = {
    getElementById(id) { return elements[id]; },
    querySelectorAll(selector) {
      assert.equal(selector, ".tabs button");
      return tabs;
    },
  };
  vm.runInNewContext(match[1], {
    document, window: {},
    Date: { now: () => now },
    setInterval(callback) {
      const id = nextId++;
      timers.set(id, callback);
      return id;
    },
    clearInterval(id) { timers.delete(id); },
  }, { filename: "pomodoro.html" });
  return {
    elements, tabs,
    click(id) { elements[id].onclick(); },
    switchTo(minutes) { tabs.find(t => Number(t.dataset.min) === minutes).onclick(); },
    advance(ms) {
      now += ms;
      for (const callback of [...timers.values()]) callback();
    },
    get activeTimers() { return timers.size; },
  };
}

test("background throttling preserves the real 25-minute duration", () => {
  const app = harness();
  assert.equal(app.elements.time.textContent, "25:00");
  app.click("toggle");
  app.advance(90_000);
  assert.equal(app.elements.time.textContent, "23:30");
  app.advance(1_410_000);
  assert.equal(app.elements.time.textContent, "00:00");
  assert.equal(app.elements.count.textContent, "Sessions completed: 1");
  assert.equal(app.activeTimers, 0);
  app.click("toggle");
  assert.equal(app.elements.time.textContent, "25:00");
  app.advance(1_000);
  assert.equal(app.elements.time.textContent, "24:59");
  assert.equal(app.elements.count.textContent, "Sessions completed: 1");
});

test("pause preserves subsecond time and stops elapsed time", () => {
  const app = harness();
  app.click("toggle");
  app.advance(1_450);
  assert.equal(app.elements.time.textContent, "24:59");
  app.click("toggle");
  assert.equal(app.elements.toggle.textContent, "Resume");
  assert.equal(app.activeTimers, 0);
  app.advance(30_000);
  assert.equal(app.elements.time.textContent, "24:59");
  app.click("toggle");
  app.advance(550);
  assert.equal(app.elements.time.textContent, "24:58");
});

test("a break does not count as a completed focus session", () => {
  const app = harness();
  app.switchTo(5);
  app.click("toggle");
  app.advance(300_000);
  assert.equal(app.elements.time.textContent, "00:00");
  assert.equal(app.elements.count.textContent, "");
  assert.equal(app.elements.mode.textContent, "Break over — back to focus!");
});

test("reset or mode switch cancels previous timer", () => {
  const app = harness();
  app.click("toggle");
  app.advance(30_000);
  app.click("reset");
  assert.equal(app.elements.time.textContent, "25:00");
  assert.equal(app.activeTimers, 0);
  app.switchTo(15);
  app.click("toggle");
  app.advance(10_000);
  assert.equal(app.elements.time.textContent, "14:50");
  app.switchTo(25);
  assert.equal(app.activeTimers, 0);
  assert.equal(app.elements.time.textContent, "25:00");
});
