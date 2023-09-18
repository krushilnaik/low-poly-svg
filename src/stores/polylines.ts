import { defineStore } from "pinia";

interface PolylineArray {
  polylines: number[][];
}

export const usePolylines = defineStore("polylines", {
  state(): PolylineArray {
    return { polylines: [] };
  },
  actions: {
    clear() {
      this.polylines = [];
    },
    add(line: number[]) {
      this.polylines.push(line);
    },
  },
});
