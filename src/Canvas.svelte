<script lang="ts">
  import { onMount, setContext } from "svelte";
  import { Matrix } from "./render";

  import {
    key,
    canvas as canvasStore,
    context as contextStore,
    pixelRatio,
    props,
    time,
  } from "./game";

  export let killLoopOnError = true;
  export let attributes = {};

  let listeners = [];
  let canvas: HTMLCanvasElement;
  let context: CanvasRenderingContext2D;
  let frame: number;

  let canvasHeight: number;
  let canvasWidth: number;

  function onCanvasMount() {
    // prepare canvas stores
    context = canvas.getContext("2d", attributes) as CanvasRenderingContext2D;
    canvasStore.set(canvas);
    contextStore.set(context);

    // setup entities
    listeners.forEach(async (entity) => {
      entity.ready = true;
    });

    function gameLoop(elapsed, dt) {
      time.set(elapsed);
      render(dt);
    }

    // start game loop
    return createLoop(gameLoop);
  }

  onMount(onCanvasMount);

  setContext(key, {
    add(fn) {
      this.remove(fn);
      listeners.push(fn);
    },
    remove(fn) {
      const idx = listeners.indexOf(fn);
      if (idx >= 0) listeners.splice(idx, 1);
    },
  });

  function render(dt) {
    context.scale($pixelRatio, $pixelRatio);
    context.setTransform($Matrix);

    function renderEntity(entity) {
      context.save();
      try {
        if (entity.mounted && entity.ready && entity.render) {
          entity.render($props, dt);
        }
      } catch (err) {
        console.error(err);
        if (killLoopOnError) {
          cancelAnimationFrame(frame);
          console.warn("Animation loop stopped due to an error");
        }
      }
      context.restore();
    }

    listeners.forEach(renderEntity);
  }

  function createLoop(fn) {
    let elapsed = 0;
    let elapsedSinceLastFrame = 0;
    let lastTime = performance.now();
    (function loop() {
      frame = requestAnimationFrame(loop);
      const beginTime = performance.now();
      const dt = (beginTime - lastTime) / 1000;
      lastTime = beginTime;
      elapsed += dt;
      elapsedSinceLastFrame += dt;
      if (elapsedSinceLastFrame >= 1 / 70) {
        elapsedSinceLastFrame = 0;
        fn(elapsed, elapsedSinceLastFrame);
      }
    })();
    return () => {
      cancelAnimationFrame(frame);
    };
  }
</script>

<!-- NOTE: width/height are set to physical device pixel units (via devicePixelRatio) -->
<!-- canvas width/height is brought back to CSS pixel units via the style directive -->
<div
  class="is-fullwidth is-fullheight"
  bind:clientHeight={canvasHeight}
  bind:clientWidth={canvasWidth}
>
  <canvas
    bind:this={canvas}
    height={canvasHeight}
    width={canvasWidth}
    style="height:{canvasHeight * devicePixelRatio};
           width:{canvasWidth * devicePixelRatio}"
  />
</div>

<slot />
