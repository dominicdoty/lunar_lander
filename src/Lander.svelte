<script lang="ts">
  import type { Line } from "./types";
  import {
    runLander,
    resetLander,
    userCodeFunction,
    landerSuccessState,
    VW,
    difficulty,
    fuelLevel,
    landerFinalState,
  } from "./render";
  import { initialFromOptions, randomizeInitialFromOptions } from "./utils";
  import { renderable, gground } from "./game";
  import { Options, options } from "./settings";
  import { fuelCapacity, LanderPhysics } from "./lander";
  import thrustSvg from "./lander_sprites/stripped/thrust.svg?raw";
  import landerSvg from "./lander_sprites/stripped/lander.svg?raw";
  import { onMount } from "svelte";

  let landerImage: HTMLImageElement;
  let thrustImage: HTMLImageElement;

  let lander: LanderPhysics;
  let flyLander: boolean = false;
  let localGround: Line = [];
  let localOptions: Options;
  let localUserCodeFunction: Function;

  function resetLanderObj() {
    lander = new LanderPhysics(
      initialFromOptions(localOptions, localGround, fuelCapacity, $VW),
      localUserCodeFunction,
      localOptions.enableFuel,
      localOptions.enableFuelMass,
      localOptions.allowableAftThrottle,
      localOptions.allowableRotThrottle,
      localGround,
      randomizeInitialFromOptions(localOptions)
    );

    $difficulty = lander.getDifficulty();
    $fuelLevel = lander.getInterpolatedState(60, 0).fuelLevel;
  }

  onMount(() => {
    $resetLander = true;
  });

  userCodeFunction.subscribe((userCodeFunction) => {
    localUserCodeFunction = userCodeFunction;
  });

  gground.subscribe((ground) => {
    localGround = ground;
    $resetLander = true;
  });

  options.subscribe((options) => {
    localOptions = options;
    $resetLander = true;
  });

  resetLander.subscribe((reset) => {
    if (reset) {
      $runLander = false;
      $landerSuccessState = "";
      resetLanderObj();
      $resetLander = false;
    }
  });

  runLander.subscribe((run) => {
    if (run) {
      lander.run(60, 60);
      flyLander = true;
    }
  });

  function renderLanders(props) {
    const context = props.context as CanvasRenderingContext2D;

    let done = lander.render(
      context,
      flyLander,
      thrustImage,
      landerImage,
      (fuel) => ($fuelLevel = fuel)
    );

    if (flyLander) {
      flyLander = false;
    }

    if (done) {
      $landerFinalState = lander.stateHist.at(-1);
      $landerSuccessState = lander.crashed ? "crashed" : "landed";
    }

    return;
  }

  renderable(renderLanders);
</script>

<div class="is-hidden">
  <img
    bind:this={landerImage}
    alt="lander, hidden"
    src="data:image/svg+xml;base64,{btoa(landerSvg)}"
  />
  <img
    bind:this={thrustImage}
    alt="lander, hidden"
    src="data:image/svg+xml;base64,{btoa(thrustSvg)}"
  />
</div>
