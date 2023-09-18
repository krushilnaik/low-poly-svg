import { useCanvas } from "@/stores";
import { traceFrom } from ".";

export function trace() {
  const { width, height, setTraced } = useCanvas();
  //Put our bitmap in a 2d grid:
  const grid = [];

  let i = 0;
  for (let y = 0; y < height; y++) {
    const row = bitmap.data.slice(i, i + width);
    grid.push(row);
    i += width;
  }

  //Trace continuous lines:
  const traces = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = grid[y][x];
      if (px) {
        traces.push.apply(traces, traceFrom(x, y, grid));
      }
    }
  }

  const tracing = {
    minLength: 15, //10,
    lineTolerance: 3, //7,
    clustering: 5,
  };

  setTraced(traces.filter((_t) => _t.length >= tracing.minLength));

  // _state.image.traced = traces.filter((_t) => _t.length >= tracing.minLength);
}
