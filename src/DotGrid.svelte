<script lang="ts">
  import { dotGridPoints } from "./dotgrid";
  import { renderable } from "./game";
  import { makeDotArray } from "./render";

  export let color = "black";
  export let pointSize = 1;

  let points2D: Path2D;
  dotGridPoints.subscribe((points) => {
    points2D = makeDotArray(points, pointSize);
  });

  function renderDotGrid(props) {
    const context = props.context;
    context.fillStyle = color;
    context.fill(points2D);
  }

  renderable(renderDotGrid);
</script>
