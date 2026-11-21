// Back and forward through every poster and setting you've had. Quick slider drags merge into one step.
const History = (() => {
  const MAX = 300;
  const MERGE_MS = 700;
  let list = [], index = -1, lastKey = null, lastTime = 0;

  // Records a state. Changes with the same key in quick succession replace the last step instead.
  function push(state, key) {
    const now = performance.now();
    if (key && key === lastKey && now - lastTime < MERGE_MS && index >= 0) list[index] = Poster.clone(state);
    else {
      list = list.slice(0, index + 1);
      list.push(Poster.clone(state));
      if (list.length > MAX) list.shift();
      index = list.length - 1;
    }
    lastKey = key; lastTime = now;
  }

  // Previous state, or null at the start.
  function back() { lastKey = null; return index > 0 ? Poster.clone(list[--index]) : null; }

  // Next state, or null at the end.
  function forward() { lastKey = null; return index < list.length - 1 ? Poster.clone(list[++index]) : null; }

  function canBack() { return index > 0; }
  function canForward() { return index < list.length - 1; }
  function position() { return { index, length: list.length }; }

  return { push, back, forward, canBack, canForward, position };
})();
