import { derived } from "svelte/store";
import { gground } from "./game";
import { type Line, type Point } from "./types";
import { VW, type CoordinateSpace } from "./render";

export let spacing = 50;

function select_points(vw: CoordinateSpace, spacing: number, ground: Line) {
  let last_gnd_idx = 0;
  let points: Point[] = [];

  let xDiv = Math.floor(vw.width / spacing);
  let yDiv = Math.floor(vw.height / spacing);

  let xOff = (vw.width - xDiv * spacing) / 2;
  let yOff = (vw.height - yDiv * spacing) / 2;

  let [px, py] = [xOff, yOff];

  for (let x = 0; x <= xDiv; x++) {
    for (let y = 0; y <= yDiv; y++) {
      // Find Corresponding Ground Point

      // traverse to left
      while (last_gnd_idx - 1 > 0 && px < ground[last_gnd_idx][0]) {
        last_gnd_idx--;
      }

      // traverse to right
      while (last_gnd_idx < ground.length - 1 && px > ground[last_gnd_idx][0]) {
        last_gnd_idx++;
      }

      // add it if above ground
      if (py > ground[last_gnd_idx][1]) {
        points.push([px, py] as Point);
      }

      py += spacing;
    }

    px += spacing;
    py = yOff;
  }

  return points as Line;
}

export const dotGridPoints = derived([VW, gground], ([vw, ground]) => {
  return select_points(vw, spacing, ground);
});
