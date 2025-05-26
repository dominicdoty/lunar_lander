<script lang="ts">
  import type { Line } from "./types";
  import { derived } from "svelte/store";
  import { gground } from "./game";
  import { fuelCapacity, LanderPhysics } from "./lander";
  import { numLanders, userCodeFunction, VW } from "./render";
  import { Options, options } from "./settings";
  import { initialFromOptions, randomizeInitialFromOptions } from "./utils";

  function runLanderTrial(): boolean {
    let lander = new LanderPhysics(
      initialFromOptions(localOptions, localGround, fuelCapacity, $VW),
      localUserCodeFunction,
      localOptions.enableFuel,
      localOptions.enableFuelMass,
      localOptions.allowableAftThrottle,
      localOptions.allowableRotThrottle,
      localGround,
      randomizeInitialFromOptions(localOptions)
    );

    lander.enablePlotting = false;
    lander.enableLogging = false;

    lander.run();
    return lander.crashed;
  }

  let trialCount: number = 0;
  let successCount: number = 0;
  let failCount: number = 0;
  let failureRate: string = "XX %";
  let intervalIdx: number | undefined = undefined;
  let trialsRunning: boolean = false;

  let trialsPause: () => void;
  let resetTrials: () => void;
  let startTrials: () => void;
  let getFailureRate: () => string;

  trialsPause = () => {
    if (intervalIdx) {
      clearInterval(intervalIdx);
      trialsRunning = false;
      intervalIdx = undefined;
    }
  };

  resetTrials = () => {
    trialsPause();
    trialCount = 0;
    successCount = 0;
    failCount = 0;
  };

  startTrials = () => {
    if (!intervalIdx) {
      let trialWrapped = () => {
        let r = runLanderTrial();
        trialCount += 1;
        if (r) {
          failCount += 1;
        } else {
          successCount += 1;
        }
        failureRate = getFailureRate();
      };
      intervalIdx = setInterval(trialWrapped, 5);
      trialsRunning = true;
    }
  };

  getFailureRate = () => {
    if (trialCount) {
      return ((failCount / trialCount) * 100).toFixed(0) + "%";
    } else {
      return "XX %";
    }
  };

  let localUserCodeFunction: Function;
  let localGround: Line;
  let localOptions: Options;
  let localNumLanders: number;

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

    resetTrials();
  });
</script>

<div class="has-text-primary p-4">
  <div class="roundbox p-4">
    <div class="columns mb-0">
      <div class="column is-narrow is-size-4">
        <div class="pb-2">
          <span class="pr-4">
            Trials {trialsRunning ? "Running" : "Idle"}
          </span>
          <span class="pl-2 loader" class:is-hidden={!trialsRunning}></span>
        </div>

        <div>
          <span class="pr-1">
            <button class="button is-success" on:click={startTrials}>
              Run Trials
            </button>
          </span>
          <span class="pr-1">
            <button class="button" on:click={trialsPause}> Pause </button>
          </span>
          <span class="pr-1">
            <button class="button is-danger" on:click={resetTrials}>
              Reset
            </button>
          </span>
        </div>
      </div>
      <div class="column"></div>
    </div>

    <div class="columns is-size-5 is-mobile">
      <div class="column is-narrow">
        <div>Number of Trials:</div>
        <div>Successful Trials:</div>
        <div>Failed Trials:</div>
        <div>Failure Rate:</div>
      </div>
      <div class="column">
        <div>{trialCount}</div>
        <div>{successCount}</div>
        <div>{failCount}</div>
        <div>{failureRate}</div>
      </div>
    </div>
  </div>
</div>

<style>
  .roundbox {
    margin: 3px;
    border: 1px;
    background-color: hsl(0, 0%, 10%);
    border-color: white;
    border-style: solid;
    border-radius: 5px;
  }

  .loader {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: inline-block;
    border-top: 3px solid #fff;
    border-right: 3px solid transparent;
    box-sizing: border-box;
    animation: rotation 1s linear infinite;
  }

  @keyframes rotation {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
