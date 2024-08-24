<script lang="ts">
  import Canvas from "./Canvas.svelte";
  import Background from "./Background.svelte";
  import DotGrid from "./DotGrid.svelte";
  import Ground from "./Ground.svelte";
  import Lander from "./Lander.svelte";
  import FPS from "./FPS.svelte";
  import Button from "./Button.svelte";
  import {
    startupModalDisplayed,
    runLander,
    resetLander,
    landerState,
    landerSuccessState,
    cartToPolar,
    userLogs,
    userPlots,
  } from "./render";
  import { onMount } from "svelte";
  import { launchError, regenerateGround } from "./game";
  import {
    crashAngleLimit,
    crashRotVelLimit,
    crashVelocityLimit,
  } from "./lander";
  import Console from "./Console.svelte";

  let modalState = "";
  if (!$startupModalDisplayed) {
    modalState = "is-active";
    $startupModalDisplayed = true;
  }
  let modalTitle = "Welcome to Lunar Pilot";
  let modalSubTitle = "";
  let modalMessage = [
    `The objective of the game is to write an autopilot controller for the lunar lander that can safely land on the surface. `,
    `The controller is written in the "Editor" tab in plain Javascript. `,
    `Your code is provided with some state information from the lander, and must return longitudinal and rotational thrust values. `,
    `Minimize your angle, velocity, and angular velocity at touchdown to land successfully!`,
  ];

  let traceBack = "";
  launchError.subscribe((error) => {
    traceBack = error;
  });

  let localFuelLevel = 100;
  let initialDifficulty = 0;

  onMount(() => {
    $launchError = "";
    landerState.subscribe((landerState) => {
      localFuelLevel = landerState.fuelLevel * 10;
    });
  });

  landerSuccessState.subscribe((state) => {
    if (state == "landed") {
      modalTitle = "You Landed!";
    } else if (state == "crashed") {
      modalTitle = "You Crashed!";
    } else {
      return;
    }

    modalState = "is-active";

    // Calculate velocity magnitude for report
    let [vel, _] = cartToPolar($landerState.linVel);

    // Score Calculation
    if (state == "landed") {
      // Score components are scaled to 0-1 through the allowable landing values
      // Components are summed and multiplied by the difficulty of the initial conditions
      let linVelScore = 1 - vel / crashVelocityLimit;
      let rotVelScore = 1 - Math.abs($landerState.rotVel) / crashRotVelLimit;
      let angleScore = 1 - Math.abs($landerState.angle) / crashAngleLimit;
      let fuelScore = $landerState.fuelLevel / $landerState.initialFuelLevel;
      let score =
        initialDifficulty *
        (linVelScore + rotVelScore + angleScore + fuelScore);
      modalSubTitle = "Score: " + score.toFixed(0);
    }

    modalMessage = [
      "Difficulty: " + initialDifficulty.toFixed(0),
      "Angle: " + $landerState.angle.toFixed(0) + "°",
      "Velocity: " + vel.toFixed(2),
      "Rotation: " + $landerState.rotVel.toFixed(2),
      "Fuel remaining: " + ($landerState.fuelLevel * 10).toFixed(0),
    ];
  });

  function closeModal() {
    $resetLander = true;
    traceBack = "";
    modalState = "";
  }
</script>

<div class="modal {modalState}">
  <div
    class="modal-background"
    on:click={closeModal}
    on:keypress={closeModal}
  />
  <div class="modal-content">
    <div class="card">
      <div class="card-content">
        <p class="title">{modalTitle}</p>
        <p class="subtitle">{modalSubTitle}</p>
        {#each modalMessage as message}
          <p>{message}</p>
        {/each}
      </div>
      <div class="card-footer">
        <div class="card-footer-item">
          <a href="https://github.com/dominicdoty/lunar_lander"
            >Source now available on GitHub!</a
          >
        </div>
      </div>
    </div>
  </div>
</div>

<div class="canvasDiv fullDiv p-1">
  <div class="overlay is-right px-2 pt-1">
    <span style="display:inline-block">
      <progress
        class="progress m-0 is-small {localFuelLevel < 25
          ? 'is-danger'
          : 'is-primary'}"
        value={localFuelLevel}
        max="100"
      />
      <div class="columns is-mobile is-size-7 has-text-white">
        <div class="column is-narrow">
          Fuel: {localFuelLevel.toFixed(0)}
        </div>
        <div class="column is-float-right">
          Difficulty: {initialDifficulty.toFixed(0)}
        </div>
      </div>
    </span>
    <span class="pl-2">
      <Button
        text="LAUNCH"
        color="is-success"
        onClick={() => {
          $runLander = true;
          $userLogs = [];
          $userPlots = [];
          initialDifficulty = $landerState.getDifficulty();
        }}
      />
    </span>
    <span class="pl-2">
      <Button
        text="RESET"
        color="is-light"
        onClick={() => {
          $resetLander = true;
          traceBack = "";
        }}
      />
    </span>
  </div>

  <div class="overlay is-left is-bottom" style="width:100%">
    <div class="columns is-mobile p-2">
      <div class="column">
        <div class={"err p-1 " + (traceBack != "" ? "" : "is-hidden")}>
          {traceBack}
        </div>
      </div>
      <div class="column is-float-right">
        <Button
          text="Regenerate Ground"
          color="is-light"
          onClick={() => {
            regenerateGround.set(true);
          }}
        />
      </div>
    </div>
  </div>

  <Canvas>
    <Console />
    <Background color="hsl(0, 0%, 10%)">
      <DotGrid color="hsla(0, 0%, 100%, 0.5)" />
      <FPS />
      <Ground color="white" ground_pix_per_seg={5} ground_noise={10} />
      <Lander />
    </Background>
  </Canvas>
</div>

<style>
  .fullDiv {
    width: 100%;
    height: 100%;
  }
  .canvasDiv {
    box-sizing: border-box;
    position: relative;
  }

  .overlay {
    position: absolute;
    z-index: 1;
  }
  .is-left {
    left: 0px;
  }

  .is-right {
    right: 0px;
  }

  .is-bottom {
    bottom: 0px;
  }

  .err {
    background-color: darkred;
    opacity: 0.9;
    color: white;
    border-radius: 0.5rem;
  }
</style>
