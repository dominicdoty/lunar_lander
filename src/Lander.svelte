<script lang="ts">
  import type { Line } from "./types";
  import {
    runLander,
    resetLander,
    userCodeFunction,
    runLanderComplete,
    VW,
    difficulty,
    fuelLevel,
    numLanders,
    launchResultMessage,
    userLogs,
    userPlots,
  } from "./render";
  import {
    average,
    cartToPolar,
    initialFromOptions,
    randomizeInitialFromOptions,
  } from "./utils";
  import { renderable, gground } from "./game";
  import { Options, options } from "./settings";
  import {
    crashAngleLimit,
    crashRotVelLimit,
    crashVelocityLimit,
    fuelCapacity,
    LanderPhysics,
  } from "./lander";
  import thrustSvg from "./lander_sprites/stripped/thrust.svg?raw";
  import landerSvg from "./lander_sprites/stripped/lander.svg?raw";
  import { onMount } from "svelte";

  let landerImage: HTMLImageElement;
  let thrustImage: HTMLImageElement;

  let landers: LanderPhysics[] = [];
  let flyLander: boolean = false;
  let localGround: Line = [];
  let localOptions: Options;
  let localNumLanders: number = 1;
  let localUserCodeFunction: Function;

  function resetLanderObj() {
    landers.map((l) => {
      l.stateHist = [];
    });
    $userLogs = [];
    $userPlots = [];

    landers = [
      ...Array(localNumLanders)
        .fill(null)
        .map(
          () =>
            new LanderPhysics(
              initialFromOptions(localOptions, localGround, fuelCapacity, $VW),
              localUserCodeFunction,
              localOptions.enableFuel,
              localOptions.enableFuelMass,
              localOptions.allowableAftThrottle,
              localOptions.allowableRotThrottle,
              localGround,
              randomizeInitialFromOptions(localOptions)
            )
        ),
    ];

    // Average difficulty
    $difficulty =
      landers.reduce((p, c) => p + c.getDifficulty(), 0) / landers.length;
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

  numLanders.subscribe((numLanders) => {
    localNumLanders = numLanders;
    $resetLander = true;
  });

  resetLander.subscribe((reset) => {
    if (reset) {
      $runLander = false;
      $runLanderComplete = false;
      resetLanderObj();
      $resetLander = false;
    }
  });

  runLander.subscribe((run) => {
    if (run) {
      // Run Simulations
      landers.map((lander) => lander.run(60, 60));

      // Enable Rendering
      flyLander = true;
    }
  });

  function renderLanders(props) {
    const context = props.context as CanvasRenderingContext2D;

    let fuelLevels: number[] = [...Array(localNumLanders)].fill(0);

    let allDone = landers.reduce(
      (done, lander, idx) =>
        lander.render(context, flyLander, thrustImage, landerImage, (fuel) => {
          fuelLevels[idx] = fuel;
        }) && done,
      true
    );

    // Average Fuel
    $fuelLevel = fuelLevels.reduce((p, c) => p + c, 0) / fuelLevels.length;

    if (flyLander) {
      flyLander = false;
    }

    if ($runLanderComplete) {
      return;
    }

    if (allDone) {
      const totCount = landers.length;
      const crashCount = landers.reduce((p, c) => p + (c.crashed ? 1 : 0), 0);
      const landCount = totCount - crashCount;
      const percent = landCount / totCount;

      const endStates = landers.map((l) => l.stateHist.at(-1));

      const avgDifficulty = average(landers.map((l) => l.getDifficulty()));
      const avgAngle = average(endStates.map((s) => s.angle));
      const avgVel = average(endStates.map((s) => cartToPolar(s.linVel)[0]));
      const avgRotVel = average(endStates.map((s) => s.rotVel));
      const avgFuelLevel = average(endStates.map((s) => s.fuelLevel));

      const linVelScore = 1 - avgVel / crashVelocityLimit;
      const rotVelScore = 1 - Math.abs(avgRotVel) / crashRotVelLimit;
      const angleScore = 1 - Math.abs(avgAngle) / crashAngleLimit;
      const fuelScore = avgFuelLevel;
      const avgScore =
        avgDifficulty * (linVelScore + rotVelScore + angleScore + fuelScore);

      const messages = [
        { pct: -0.1, msg: "Stick to the day job..." },
        { pct: 0.1, msg: "Not a complete failure!" },
        { pct: 0.3, msg: "I wouldn't fly on it" },
        { pct: 0.5, msg: "Getting there!" },
        { pct: 0.7, msg: "Fairly Adequate Bud" },
        { pct: 0.95, msg: "Perfection!" },
      ];

      const subtitle = messages
        .filter(({ pct, msg }) => percent >= pct)
        .at(-1).msg;

      $launchResultMessage = {
        title: `Landed ${landCount}/${totCount} Attempts`,
        subtitle: subtitle,
        messages: [
          "Success: " + (percent * 100).toFixed(0) + "%",
          "Score: " + avgScore.toFixed(0),
          "Difficulty: " + avgDifficulty.toFixed(0),
          "Angle: " + avgAngle.toFixed(0) + "°",
          "Velocity: " + avgVel.toFixed(2),
          "Rotation: " + avgRotVel.toFixed(2),
          "Fuel remaining: " + (avgFuelLevel * 10).toFixed(0),
        ],
      };

      $runLanderComplete = true;
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
