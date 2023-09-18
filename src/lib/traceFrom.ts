import { tuple } from "./tuple";

export function traceFrom(x_1, y_1, grid) {
  const branches = [];

  function checkPixel(x, y) {
    return grid[y] && grid[y][x];
  }

  function findNext(x, y, findAll = false) {
    const options = [];
    //Check up/down/left/right first, and only diagonals if we don't find anything.
    //This will let us trace "staircases" as one line, and not a series or intersections.
    if (checkPixel(x, y - 1)) {
      options.push(tuple(x, y - 1));
    }
    if (checkPixel(x, y + 1)) {
      options.push(tuple(x, y + 1));
    }
    if (checkPixel(x - 1, y)) {
      options.push(tuple(x - 1, y));
    }
    if (checkPixel(x + 1, y)) {
      options.push(tuple(x + 1, y));
    }

    if (options.length && !findAll) {
      return options;
    }

    if (checkPixel(x - 1, y - 1)) {
      options.push(tuple(x - 1, y - 1));
    }
    if (checkPixel(x + 1, y - 1)) {
      options.push(tuple(x + 1, y - 1));
    }
    if (checkPixel(x - 1, y + 1)) {
      options.push(tuple(x - 1, y + 1));
    }
    if (checkPixel(x + 1, y + 1)) {
      options.push(tuple(x + 1, y + 1));
    }

    return options;
  }

  function collect(a, b, branch) {
    branch.push(tuple(a, b));
    grid[b][a] = 0;
  }

  function addBranch(startX, startY) {
    const branch = [];
    collect(startX, startY, branch);
    branches.push(branch);
    return branch;
  }

  //Start by initing our main branch
  addBranch(x_1, y_1);

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];
    let [x0, y0] = branch[0],
      [x, y] = branch[branch.length - 1];

    let nexts,
      pass = 1,
      endOfLine = false;
    while (true) {
      nexts = findNext(x, y);

      //If we reach an intersection:
      if (nexts.length > 1 && branch.length > 1) {
        //This may just be a 1px branch/noise, or a small section where the edge is 2px wide.
        //To test that, we look at all the pixels we can reach from the first step of a new branch.
        //If there are no more pixels than we can reach from our current position,
        //it's just noise and not an actual branch.
        const currentReach = findNext(x, y, true);
        let maxReach = -1,
          maxBranch,
          toDelete = [];
        nexts = nexts.filter(([xx, yy]) => {
          const branchReach = findNext(xx, yy, true);
          const branchHasNewPixels = branchReach.some((px) => !currentReach.includes(px));

          if (branchReach.length > maxReach) {
            maxReach = branchReach.length;
            maxBranch = tuple(xx, yy);
          }

          //If we decide this is just noise, clear the pixel so it's not picked up by a later traceFrom().
          //Do that after this loop is finished, or else it will interfere with the other branches chance at a `maxReach`:
          if (!branchHasNewPixels) {
            toDelete.push(tuple(xx, yy));
          }

          return branchHasNewPixels;
        });
        toDelete.forEach(([xx, yy]) => (grid[yy][xx] = 0));

        //If we filtered away all the branches, keep the one with more pixels.
        //This lets us go around noisy corners or finish noisy line ends:
        if (nexts.length === 0) {
          nexts = [maxBranch];
        }

        //This is a real intersection of branches:
        if (nexts.length > 1) {
          nexts.forEach((coord) => {
            const otherBranch = addBranch(x, y);
            collect(coord[0], coord[1], otherBranch);
          });
          endOfLine = true;
        }
      }

      //Keep following the current branch:
      if (nexts.length && !endOfLine) {
        [x, y] = nexts[0];
        collect(x, y, branch);
      } else {
        endOfLine = true;
      }

      if (endOfLine) {
        if (pass === 1) {
          //Reverse and trace in the other direction from our starting point;
          branch.reverse();
          x = x0;
          y = y0;

          pass = 2;
          endOfLine = false;
        } else {
          break;
        }
      }
    }
  }
  return branches;
}
