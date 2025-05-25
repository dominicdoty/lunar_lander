<script lang="ts">
  import type { Line } from "./types";
  import {
    runLander,
    resetLander,
    userCodeFunction,
    showModal,
    VW,
    difficulty,
    fuelLevel,
    numLanders,
    launchResultMessage,
  } from "./render";
  import {
    average,
    cartToPolar,
    initialFromOptions,
    randomizeInitialFromOptions,
  } from "./utils";
  import { renderable, gground, launchError } from "./game";
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
  import { derived } from "svelte/store";
  import { onDestroy, onMount } from "svelte";

  let landerImage: HTMLImageElement;
  let thrustImage: HTMLImageElement;

  enum LanderTabState {
    "RESET",
    "SETTINGSWAIT",
    "HOLD",
    "IDLE",
    "FLYING",
    "INFOMODAL",
  }

  let state: LanderTabState = LanderTabState.RESET;

  onMount(() => {
    state = LanderTabState.SETTINGSWAIT;
    settingsWaiter.set(10);
  });

  onDestroy(() => {
    state = LanderTabState.HOLD;
  });

  let landers: LanderPhysics[] = [];

  let settingsWaiter = (() => {
    let settingsWaitTimeoutId: number = null;
    return {
      set: (timeMs: number) => {
        if (settingsWaitTimeoutId) {
          clearTimeout(settingsWaitTimeoutId);
        }
        settingsWaitTimeoutId = setTimeout(() => {
          settingsWaitTimeoutId = null;
          state = LanderTabState.RESET;
        }, timeMs);
      },
    };
  })();

  let localGround: Line = [];
  let localOptions: Options;
  let localNumLanders: number = 1;
  let localUserCodeFunction: Function;

  function resetLanderObj() {
    landers.map((l) => {
      l.stateHist = [];
    });

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

  let landerInputs = derived(
    [userCodeFunction, gground, options, numLanders],
    ([$userCodeFunction, $gground, $options, $numLanders]) => ({
      userCodeFunction: $userCodeFunction,
      ground: $gground,
      options: $options,
      numLanders: $numLanders,
    })
  );

  landerInputs.subscribe((landerInputs) => {
    ({
      userCodeFunction: localUserCodeFunction,
      ground: localGround,
      options: localOptions,
      numLanders: localNumLanders,
    } = landerInputs);

    // Only transition if we're active
    if (state != LanderTabState.HOLD) {
      state = LanderTabState.SETTINGSWAIT;
      settingsWaiter.set(10);
    }
  });

  // Signal from RESET button
  resetLander.subscribe((reset) => {
    if (reset) {
      state = LanderTabState.RESET;
    }
  });

  // Signal from LAUNCH button
  runLander.subscribe((run) => {
    if (run && state == LanderTabState.IDLE) {
      // Run Simulations
      landers.map((lander) => lander.run(60, 60));

      // Enable Rendering
      state = LanderTabState.FLYING;
    }
  });

  function generateModal(landers: LanderPhysics[]) {
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

    return {
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
  }

  let lastState: LanderTabState = state;

  function renderLanders(props) {
    const context = props.context as CanvasRenderingContext2D;

    if (state != lastState) {
      console.log(LanderTabState[state]);
      lastState = state;
    }

    switch (state) {
      case LanderTabState.RESET: {
        resetLanderObj();
        state = LanderTabState.IDLE;
        break;
      }

      case LanderTabState.SETTINGSWAIT: {
        // Do nothing, the external timeout will kick us out of here
        // This state is for debouncing - settings updates will fire multiple times
        // in quick succession, so waiting here minimizes unnecessary resets

        if (
          [
            localGround,
            localOptions,
            localNumLanders,
            localUserCodeFunction,
          ].some((item) => item === undefined)
        ) {
          settingsWaiter.set(25);
        }

        break;
      }

      case LanderTabState.HOLD: {
        // Do nothing, the onMount callback will kick us out of here
        // This state is to ensure the machine does nothing while we're on other tabs
        break;
      }

      case LanderTabState.IDLE: {
        // Render lander, but not flying
        landers.map((lander) =>
          lander.render(context, false, thrustImage, landerImage, (fuel) => {})
        );

        $fuelLevel = fuelCapacity;
        break;
      }

      case LanderTabState.FLYING: {
        let fuelLevels: number[] = [...Array(localNumLanders)].fill(0);

        let allDone = landers.reduce(
          (done, lander, idx) =>
            lander.render(context, true, thrustImage, landerImage, (fuel) => {
              fuelLevels[idx] = fuel;
            }) && done,
          true
        );

        landers.map((lander) => {
          if (lander.error) {
            $launchError = lander.error;
          }
        });

        // Average Fuel
        $fuelLevel = fuelLevels.reduce((p, c) => p + c, 0) / fuelLevels.length;

        if (allDone) {
          $launchResultMessage = generateModal(landers);
          state = LanderTabState.INFOMODAL;
          $showModal = false; // signal to outer container to show the modal
          $showModal = true; // signal to outer container to show the modal
        }
        break;
      }

      case LanderTabState.INFOMODAL: {
        break;
      }

      default: {
        state = LanderTabState.RESET;
        break;
      }
    }
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
