<script>
  import { renderable } from "./game";
  import { VW } from "./render";
  export let color = null;

  function renderBackground(props) {
    const { context } = props;
    context.clearRect(0, 0, $VW.width, $VW.height);
    if (color) {
      context.fillStyle = color;
      context.fillRect(0, 0, $VW.width, $VW.height);
    }
  }

  renderable(renderBackground);
</script>

<!-- The following allows this component to nest children -->
<slot />
