export const tuple = (function () {
  "use strict";
  let map = new Map();
  function tuple() {
    let current = map;
    let args = Object.freeze(Array.from(arguments));
    for (let item of args) {
      if (current.has(item)) {
        current = current.get(item);
      } else {
        let next = new Map();
        current.set(item, next);
        current = next;
      }
    }
    if (!current._myVal) {
      current._myVal = args;
    }
    return current._myVal;
  }
  return tuple;
})();
