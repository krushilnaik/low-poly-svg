<script setup lang="ts">
  import { onMounted, ref, computed } from "vue";
  import { useCanvas } from "@/stores";
  import { cluster, traceFrom } from "@/lib";
  import jsfeat from "jsfeat";
  import cdt2d from "cdt2d";
  import { tuple } from "./lib/tuple";

  const { width, height } = useCanvas();
  const { setWidth, setHeight } = useCanvas();
  // const { triangles } = useTriangles();
  const source = ref<HTMLCanvasElement>();

  const polylines = computed(() => {
    const { traced } = useCanvas();

    const tracing = {
      minLength: 15, //10,
      lineTolerance: 3, //7,
      clustering: 5,
    };

    const polys = traced.map((trace) => {
      return simplify(trace, tracing.lineTolerance, true);
    });

    //Combine near-duplicate points:
    if (tracing.clustering) {
      const allPoints = polys.flatMap((poly) =>
        poly.map((xy, i) => {
          return {
            originalPoint: xy,
            polyline: poly,
            i,
          };
        })
      );
      const clustered = cluster(
        allPoints.map((p) => p.originalPoint),
        tracing.clustering
      );
      clustered.forEach((cluster) => {
        const center = tuple(...cluster.center);
        cluster.pointIds.forEach((pointIndex) => {
          const pointInfo = allPoints[pointIndex],
            poly = pointInfo.polyline;
          if (center[0] < pointInfo.originalPoint[0] - 50) {
            debugger;
          }
          poly[pointInfo.i] = center;
        });
      });
    }

    return polys;
  });

  const triangles = computed(() => {
    if (!polylines.value.length) {
      return [];
    }

    const points = new Set(),
      edges = [];

    polylines.value.forEach((poly) => {
      let p1 = tuple(...poly[0]),
        p2;
      points.add(p1);
      for (let i = 1; i < poly.length; i++) {
        p2 = tuple(...poly[i]);
        //The clustering of polylines may lead to a few
        //back-to-back duplicate points, which we can skip:
        if (p2 !== p1) {
          points.add(p2);
          edges.push([p1, p2]);
          p1 = p2;
        }
      }
    });

    //Add helper points and corners, and then do a Constrained Delaunay triangulation:
    // this.options.customPoints.forEach((p) => points.add(tuple(...p)));
    points
      .add(tuple(0, 0))
      .add(tuple(width, 0))
      .add(tuple(width, height))
      .add(tuple(0, height));

    const pointsArr = Array.from(points),
      edgeIndexes = edges.map((edge) => edge.map((p) => pointsArr.indexOf(p)));

    let delaunay;

    // try {
    delaunay = cdt2d(pointsArr, edgeIndexes, {
      delaunay: true,
    });
    // } catch (ex) {
    //   //"TypeError: Cannot read property 'upperIds' of undefined"
    //   delaunay = [];
    // }

    const triangles = delaunay.map((tri) => tri.map((i) => pointsArr[i]));

    console.log("triangles", triangles);

    return triangles;
  });

  const downloadSVG = (event: MouseEvent) => {
    //
  };

  const render = () => {
    const { width, height, setTraced } = useCanvas();

    if (source.value) {
      const ctx = source.value.getContext("2d");
      const bitmap = new jsfeat.matrix_t(width, height, jsfeat.U8C1_t);
      const imageData = ctx?.getImageData(0, 0, width, height);

      if (imageData) {
        jsfeat.imgproc.grayscale(imageData.data, width, height, bitmap);
        jsfeat.imgproc.canny(bitmap, bitmap, 90, 100);

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

        const result = traces.filter((_t) => _t.length >= 15);

        console.log(result);

        setTraced(result);
      }
    }
  };

  function centroid(triangle: number[][]) {
    let x = 0,
      y = 0;
    triangle.forEach((point: number[]) => {
      x += point[0];
      y += point[1];
    });
    return [x / 3, y / 3];
  }

  function pickColor(triangle: number[][]) {
    const ctx = source.value?.getContext("2d");

    if (ctx) {
      const imageData = ctx.getImageData(0, 0, width, height).data;

      const [x, y] = centroid(triangle).map(Math.round),
        i = 4 * (y * width + x);

      const r = imageData[i],
        g = imageData[i + 1],
        b = imageData[i + 2];

      //Nearest 3-digit hex:
      return `rgb(${[r, g, b]})`;
    }
  }

  onMounted(() => {
    console.log("component mounted");

    const ctx = source.value?.getContext("2d");

    if (ctx) {
      const img = new Image();

      img.onload = (e) => {
        // setImage(img);
        const { width, height } = img;

        setWidth(width);
        setHeight(height);

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        console.log("arceus drawn to canvas");

        //Changing a canvas' size (which is done by Vue) clears its content,
        //so make sure we render() *after* the size has changed:
        setTimeout(() => {
          render();
        }, 0);
      };

      if (source.value) {
        source.value.onchange = function (e) {
          let url = URL.createObjectURL(this.files[0]);
          img.src = url;
        };
      }

      img.crossOrigin = "anonymous";
      img.src = "/0493_Arceus.png";
    }
  });
</script>

<template>
  <main>
    <input type="file" @change="render" id="sourceImg" accept="image/*" />

    <div class="canvases">
      <div class="canvas">
        <h1>Source</h1>
        <canvas id="source" ref="source" :width="width" :height="height"></canvas>
      </div>
      <div class="canvas">
        <h1>Processed</h1>
        <svg
          id="low-poly"
          :width="width"
          :height="height"
          fill="currentColor"
          stroke="currentColor"
          stroke-width=".5"
        >
          <path v-for="tri in triangles" :d="'M' + tri" :color="pickColor(tri)" />
        </svg>
      </div>
    </div>
    <a href="#" @click="downloadSVG">Download SVG ({{ triangles.length }} polygons)</a>
  </main>
</template>

<style scoped>
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  canvas,
  svg {
    /* background-color: #fff1; */
    background-color: black;
    border-radius: 0.5rem;
    max-width: 80vw;
    max-height: 80vw;
  }

  input {
    background-color: tomato;
  }

  a {
    color: tomato;
  }

  .canvas {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .canvases {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 2rem;
  }
</style>
