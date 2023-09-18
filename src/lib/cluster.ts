export function cluster(points, tolerance) {
  function avgPos(points) {
    const len = points.length;
    let sumX = 0,
      sumY = 0;
    points.forEach(([x, y]) => {
      sumX += x;
      sumY += y;
    });
    return [sumX / len, sumY / len];
  }

  function dist2(a, b) {
    const dx = a[0] - b[0],
      dy = a[1] - b[1];
    return dx * dx + dy * dy;
  }

  const clusters = [];
  let pointInfos = points.map((p, i) => ({
    xy: p,
    //Below, we'll shrink this array of points step by step,
    //so we need to keep track of all points' positions in the original array
    //to report correct .pointIds at the end:
    origIndex: i,
  }));

  //Find and combine the densest cluster of points,
  //one at a time, until there are no clusters left:
  const minClusterDistance2 = 4 * tolerance * tolerance;
  let toRemove,
    failsafe = 0;
  do {
    toRemove = [];
    failsafe++;

    const newPoints = pointInfos.map((p) => p.xy);
    const index = new KDBush(newPoints);

    const clusterCombos = new Set();
    const tempClusters = newPoints
      .map(([x, y]) => {
        const pointIds = index.within(x, y, tolerance),
          population = pointIds.length;

        //We get duplicates of most clusters
        //(point A is right next to B, thus point B is also right next to A):
        const combo = tuple(...pointIds);
        if (clusterCombos.has(combo)) {
          return null;
        }
        clusterCombos.add(combo);

        //We can safely put aside clusters of population 1 (single points) right away.
        //These will never be a part of any actual cluster on subsequent recalculations:
        if (population === 1) {
          const id = pointIds[0],
            pointInfo = pointInfos[id];
          toRemove.push(id);
          clusters.push({
            center: pointInfo.xy,
            pointIds: [pointInfo.origIndex],
          });
          return null;
        }

        return { pointIds, population };
      })
      //Better to build a sorted array one item at a time in the loop above?
      //https://stackoverflow.com/questions/1344500/efficient-way-to-insert-a-number-into-a-sorted-array-of-numbers
      .filter((x) => x)
      .sort((a, b) => b.population - a.population);

    //log('temp', failsafe, tempClusters);

    //Now, we can combine the densest clusters into one point as long as the clusters don't overlap.
    //If we find a group of overlapping clusters, we can only pick the largest one, and then recalculate.
    let prevCenter;
    for (const cl of tempClusters) {
      const ids = cl.pointIds,
        pop = cl.population,
        center = avgPos(ids.map((i) => newPoints[i]));

      let doCombine = false;
      if (prevCenter) {
        const dist = dist2(center, prevCenter);
        if (dist > minClusterDistance2) {
          doCombine = true;
        }
      }
      //This is the first and largest cluster. Always combine:
      else {
        doCombine = true;
      }
      if (!doCombine) {
        break;
      }

      toRemove.push.apply(toRemove, ids);
      clusters.push({
        center,
        pointIds: ids.map((i) => pointInfos[i].origIndex),
      });
      prevCenter = center;
    }

    pointInfos = pointInfos.filter((p, i) => !toRemove.includes(i));
    //log('clusters/points', clusters.length, pointInfos.length)
  } while (pointInfos.length && failsafe < 999);

  return clusters;
}
