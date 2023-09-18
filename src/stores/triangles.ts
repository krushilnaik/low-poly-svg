import { defineStore } from "pinia";

interface TriangleArray {
  triangles: number[][];
}

export const useTriangles = defineStore("triangles", {
  state(): TriangleArray {
    return { triangles: [] };
  },
  actions: {
    clear() {
      this.triangles = [];
    },
    add(tri: number[]) {
      this.triangles.push(tri);
    },
  },
});
