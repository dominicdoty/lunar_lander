<script>
  import Text from "./Text.svelte";
  import { renderable } from "./game";

  let text = "";

  let frames = 0;
  let prevTime = performance.now(); // ms

  function renderFps() {
    let time = performance.now();
    frames++;
    if (time >= prevTime + 500) {
      // (prevTime + 500) sets update/avg interval (in ms)
      const fps = (frames * 1000) / (time - prevTime);
      text = `${fps.toFixed(1)} FPS`;
      prevTime = time;
      frames = 0;
    }
  }

  renderable(renderFps);
</script>

<Text
  {text}
  fontSize={12}
  fontFamily="Courier New"
  align="left"
  baseline="bottom"
  x={5}
  y={5}
/>
