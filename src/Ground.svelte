<script lang="ts">
  import type { Point } from "./types";
  import { renderable, gground, regenerateGround } from "./game";
  import { options } from "./settings";
  import { path2DCreate, VW } from "./render";
  import { genGround, reSeedGround } from "./ground_utils";
  import { Prng } from "./pseudo_random";

  // Configurable Parameters
  export let ground_noise: number = 5;
  export let ground_pix_per_seg: number = 5;
  export let color: string = "white";

  let ground_seed: string = "";
  let ground_variability: number = 100;
  let ground = $gground;
  let groundPath: Path2D;

  let generateInitialGround = () => {
    let segments = Math.floor($VW.width / ground_pix_per_seg);
    let prng = new Prng(ground_seed);
    ground = genGround(
      prng.rand,
      [$VW.x, $VW.y + 30] as Point,
      [$VW.x + $VW.width, $VW.y + 30] as Point,
      segments,
      ground_variability,
      ground_noise
    );
    gground.set(ground);
  };

  // Set Ground Variability
  options.subscribe((opt) => {
    if (
      opt.groundVariability != ground_variability ||
      opt.groundSeed != ground_seed
    ) {
      ground_variability = opt.groundVariability;
      ground_seed = opt.groundSeed;
      generateInitialGround();
    }
  });

  // Re-generate Ground on request
  regenerateGround.subscribe((regen) => {
    if (regen) {
      $options.groundSeed = reSeedGround();
      generateInitialGround();
      $regenerateGround = false;
    }
  });

  // Generate Initial Ground
  if (ground.length == 1) {
    generateInitialGround();
  }

  // Generate More Ground when VW Changes
  VW.subscribe((vw) => {
    let lastGroundPoint = ground[ground.length - 1];
    let newWidth = vw.width - lastGroundPoint[0];

    // Generate new ground "chunk" when window gets bigger
    if (newWidth > ground_pix_per_seg) {
      let newLastGroundPoint: Point = [
        lastGroundPoint[0] + newWidth,
        vw.y + 30,
      ];

      let prng = new Prng($options.groundSeed);
      let newGround = genGround(
        prng.rand,
        lastGroundPoint,
        newLastGroundPoint,
        Math.floor(newWidth / ground_pix_per_seg),
        ground_variability,
        ground_noise
      );

      ground = ground.concat(newGround);
      gground.set(ground);
    }
  });

  gground.subscribe((ground) => {
    groundPath = path2DCreate(ground);
  });

  function renderGround(props) {
    const context = props.context;
    context.strokeStyle = color;
    context.lineWidth = 1;
    // TODO: For some reason the performance of this stroke call sucks.
    context.stroke(groundPath);
  }

  renderable(renderGround);
</script>
