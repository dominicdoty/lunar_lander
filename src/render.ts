import { derived, writable } from "svelte/store";
import type { Writable } from "svelte/store";
import type { LanderPhysics } from "./lander";
import type { Point, Line } from "./types";
import { aboveGround } from "./ground_utils";
import { polarToCart, cartToPolar, deg2rad } from "./utils";
import initialCode from "./default_editor_contents.js?raw";

export const outerAppPadding = 10; // px
export const innerAppPadding = 5; // px

export const userCode = writable(initialCode);
export const userCodeFunction = writable(() => {
  return { rotThrust: 0, aftThrust: 0, userStore: {} };
});
export const userLogs = writable([]);
export const userPlots = writable([]);
export const startupModalDisplayed = writable(false);
export const runLander = writable(false);
export const resetLander = writable(false);
export const landerSuccessState = writable("");
export const landerState: Writable<LanderPhysics> = writable();

/** Coordinate system view
 * used to represent internal game coordinate space, and render view space
 */
export type CoordinateSpace = {
  x: number;
  y: number;
  width: number;
  height: number;
};

let initialWindow: CoordinateSpace = {
  x: 0,
  y: 0,
  width: window.innerWidth,
  height: window.innerHeight,
};

// Tab window (area available in the tab content box)
export const TW = writable(initialWindow);

// View window (in game viewable area)
// Mostly just the XY offset and size of what we can see in game space
export const VW = derived(TW, ($TW) => {
  return {
    height: $TW.height - 2 * innerAppPadding,
    width: $TW.width - 2 * innerAppPadding,
    x: 0, // always zero, don't move the view window, only the render window
    y: 0, // always zero, don't move the view window, only the render window
  } as CoordinateSpace;
});

// Render window (canvas sized window)
// Should really be a XY Scale number applied on view window?
export const RW = writable(initialWindow);

// Transform Matrix that desrcribes
// how to move a point from game space / view window to the render window
export const Matrix = derived([VW, RW], ($values, set) => {
  set(updateTransformMatrix($values[0], $values[1]));
});

// Update the context transform used on the canvas
function updateTransformMatrix(vw: CoordinateSpace, rw: CoordinateSpace) {
  let matrix = new DOMMatrix();
  matrix = matrix.flipY();
  matrix = matrix.translate(0, -vw.height);
  // TODO: Update matrix to accomodate scaling from vw to rw as well
  // TODO: Should Matrix be a derived store?
  return matrix;
}

// Render point (as dot) from Game Space via VW to RW
export function canvasRenderPoint(
  context: CanvasRenderingContext2D,
  point: Point,
  pointSize: number
) {
  let [px, py] = point;
  context.beginPath();
  context.arc(px, py, pointSize, 0, Math.PI * 2);
  context.fill();
}

export function makeDotArray(points: Point[], pointSize: number) {
  let wholePath = new Path2D();

  points.forEach((point) => {
    let [px, py] = point;
    let p = new Path2D();
    p.arc(px, py, pointSize, 0, Math.PI * 2);
    wholePath.addPath(p);
  });

  return wholePath;
}

// Render points (as dot) from Game Space via VW to RW
export function canvasRenderPoints(
  context: CanvasRenderingContext2D,
  points: Point[],
  pointSize: number
) {
  points.map((point) => canvasRenderPoint(context, point, pointSize));
}

export function canvasRenderLine(
  context: CanvasRenderingContext2D,
  line: Line
) {
  context.beginPath();

  let [startX, startY] = line[0];
  context.moveTo(startX, startY);

  line.map((p) => {
    let [x, y] = p;
    context.lineTo(x, y);
  });

  context.stroke();
}

export function path2DCreate(line: Line): Path2D {
  let path = new Path2D();

  let [startX, startY] = line[0];
  path.moveTo(startX, startY);

  line.map((p) => {
    let [x, y] = p;
    path.lineTo(x, y);
  });

  return path;
}

// Render line from Game Space via VW to RW
export function canvasRenderLines(
  context: CanvasRenderingContext2D,

  lines: Line[]
) {
  lines.map((line) => canvasRenderLine(context, line));
}

// Rotate a Line
export function Rotate(points: Point[], angle: number) {
  points.forEach((_, i, a) => {
    let cos = Math.cos(deg2rad(-1 * (angle - 90)));
    let sin = Math.sin(deg2rad(-1 * (angle - 90)));
    let x1 = a[i][0];
    let y1 = a[i][1];
    a[i][0] = x1 * cos - y1 * sin; // x
    a[i][1] = x1 * sin + y1 * cos; // y
  });

  return points;
}

// Translate a Line
export function Translate(points: Point[], offset: Point): Point[] {
  return points.map((v) => {
    return [v[0] + offset[0], v[1] + offset[1]];
  });
}

// Render Explosion
export class ExplosionParticle {
  pos: Point;
  vel: Point;
  size: number;
  ground: Line;
  hint: number = 0;

  constructor(pos: Point, vel: Point, size: number, ground: Line) {
    this.pos = pos;
    this.vel = vel;
    this.ground = ground;
    this.size = size;
  }

  render(context: CanvasRenderingContext2D) {
    let above: boolean;

    // Skip if we've failed before
    if (this.hint < 0) {
      return;
    }

    // Try to find ground
    try {
      above = aboveGround(this.ground, this.pos);
    } catch {
      // Note that we failed and stop drawing
      above = false;
      this.hint = -1;
    }

    if (above) {
      this.vel = [this.vel[0], this.vel[1] - 1 / 60];
      this.pos = [this.pos[0] + this.vel[0], this.pos[1] + this.vel[1]];
      context.arc(this.pos[0], this.pos[1], this.size, 0, 2 * Math.PI);
    }
  }
}

export class Explosion {
  particles: ExplosionParticle[];

  constructor(
    startingPos: Point,
    startingVel: Point,
    scale: number,
    ground: Line
  ) {
    // Reflect startingVel in the Y direction
    startingVel = [startingVel[0], Math.abs(startingVel[1])];

    // Convert to polar
    let [mag, angle] = cartToPolar(startingVel);

    // Scale it up
    mag *= scale;

    this.particles = [...Array(350)].map(() => {
      let randFactor =
        [...Array(4)]
          .map(() => {
            return Math.random();
          })
          .reduce((p, a) => p + a, 0) / 4;

      return new ExplosionParticle(
        startingPos,
        polarToCart(
          (mag * 2 * randFactor * Math.random()) / 2,
          angle + 180 * (randFactor * 2 - 1)
        ) as Point,
        0.5,
        ground
      );
    });
  }

  render(context: CanvasRenderingContext2D) {
    context.strokeStyle = "white";
    this.particles.forEach((ep) => {
      context.beginPath();
      ep.render(context);
      context.stroke();
    });
  }
}
