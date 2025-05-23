import type { Point, Line } from "./types";

export function reSeedGround() {
  return btoa(Math.random().toFixed(16));
}

function genBumpy(
  rand: () => number,
  segments: number,
  target: Point[],
  noise: number
): Line {
  // declare empty
  let ground = Array(segments).fill([0, 0] as Point);

  // find total width of target
  let len = target[target.length - 1][0] - target[0][0];

  // find segment length
  let seg_len = len / segments;

  // iterate ground segment creation
  let [x, y] = target[0];
  let targ_idx = 0;
  let integral = 0;
  const P = 0.01;
  const I = 0.0005;

  for (let i = 0; i < segments; i++) {
    // X always moves right
    x += seg_len;

    // get target
    let [t_x, t_y] = target[targ_idx];

    // check if we have a new target
    if (x >= t_x && targ_idx < target.length - 1) {
      targ_idx++;
      [t_x, t_y] = target[targ_idx];
    }

    // further we are from target y, the more likely we need to make
    // the sign of the correction take us back to the goal
    let err = t_y - y; // (negative error needs a negative correction)
    integral += err;
    y += (rand() - 0.5) * noise + P * err + I * integral;
    // bias away from negative closer we are to zero, the more we need to push positive
    // Math.abs(1 / (y + 0.01));

    // store
    ground[i] = [x, y] as Point;
  }

  return ground;
}

export function genGround(
  rand: () => number,
  start: Point,
  end: Point,
  points: number,
  variability: number,
  noise: number
): Line {
  let grossFactor = 20;
  let length = end[0] - start[0];
  let grossSegmentLength = (length / points) * grossFactor;

  // Generate a random large scale bumpiness to use as a target for the next step
  let roughGround = Array.from({ length: 2 + points / grossFactor }, (x, i) => {
    return [
      i * grossSegmentLength + start[0],
      50 + rand() * variability,
    ] as Point;
  });

  // Force start/end targets to be accurate
  roughGround[0] = start;
  roughGround[roughGround.length - 1] = end;

  // Generate fine noise bound to the target bumpiness with a PI controller
  let bumpyGround = genBumpy(rand, points, roughGround, noise);

  return bumpyGround;
}

/**
 * @param ground points for ground
 * @param p point of interest
 * @returns ground point closest to directly below supplied point and a hint
 */
export function findGroundPoint(ground: Line, p: Point): [Point, boolean] {
  // Calculate expected index of ground point
  // based on ground len over delta pixels
  let idxPerGpx = ground.length / (ground[ground.length - 1][0] - ground[0][0]);
  let idx = Math.round(p[0] * idxPerGpx);

  // Saturate
  let satuated = false;
  if (idx < 0) {
    idx = 0;
    satuated = true;
  } else if (idx > ground.length - 1) {
    idx = ground.length - 1;
    satuated = true;
  }

  return [ground[idx], satuated];
}

/**
 * @param ground points for ground
 * @param p point of interest
 * @returns t/f point above ground, hint for next call
 */
export function aboveGround(ground: Line, p: Point): boolean {
  let [gp, sat] = findGroundPoint(ground, p);
  return p[1] > gp[1] && !sat;
}
