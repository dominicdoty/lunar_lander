<script lang="ts">
  import { renderable } from "./game";
  import { VW } from "./render";

  export let color = "hsl(0, 0%, 100%)";
  export let align = "center";
  export let baseline = "middle";

  export let text = "";
  export let x = 0;
  export let y = 0;

  export let fontSize = 16;
  export let fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica';

  function renderText(props) {
    const {
      context,
      width,
      height,
    }: { context: CanvasRenderingContext2D; width: number; height: number } =
      props;
    if (text) {
      let transform = context.getTransform();
      // move, then flip, then move?
      context.resetTransform();
      context.translate(x, $VW.height - y);
      context.fillStyle = color;
      context.font = `${fontSize}px ${fontFamily}`;
      context.textAlign = align;
      context.textBaseline = baseline;
      context.fillText(text, 0, 0);
      context.scale(1, -1);
    }
  }

  renderable(renderText);
</script>
