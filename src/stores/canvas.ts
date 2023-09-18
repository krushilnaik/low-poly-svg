import { defineStore } from "pinia";

interface Canvas {
  width: number;
  height: number;
  traced: number[][];
}

export const useCanvas = defineStore("canvas", {
  state(): Canvas {
    return {
      width: 570,
      height: 570,
      traced: [],
    };
  },
  actions: {
    setWidth(w: number) {
      this.width = w;
    },
    setHeight(h: number) {
      this.height = h;
    },
    setTraced(t: number[][]) {
      this.traced = t;
    },
    addTraced(p: number[]) {
      this.traced.push(p);
    },
    clearTraced() {
      this.traced = [];
    },
  },
});
