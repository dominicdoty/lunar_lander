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
    showModal,
    userLogs,
    userPlots,
    difficulty,
    fuelLevel,
    numLanders,
    launchResultMessage,
  } from "./render";
  import { onMount } from "svelte";
  import { launchError, regenerateGround } from "./game";
  import Console from "./Console.svelte";
  import IncDecButton from "./IncDecButton.svelte";
  import { fuelCapacity } from "./lander";

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

  function resetLanderToggle() {
    $resetLander = false;
    $resetLander = true;
  }
  function runLanderToggle() {
    $runLander = false;
    $runLander = true;
  }

  onMount(() => {
    $launchError = "";
  });

  let traceBack = "";
  launchError.subscribe((error) => {
    traceBack = `${error}`;
  });

  let localFuelLevel = fuelCapacity * 10;
  fuelLevel.subscribe((fuel) => {
    if (fuel) {
      localFuelLevel = fuel * 10;
    }
  });

  showModal.subscribe((show) => {
    if (show) {
      modalState = "is-active";
      ({
        title: modalTitle,
        subtitle: modalSubTitle,
        messages: modalMessage,
      } = $launchResultMessage);
    }
  });

  function closeModal() {
    resetLanderToggle();
    traceBack = "";
    modalState = "";
    $showModal = false;
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

<div class="is-rel-borderbox is-fullheight is-fullwidth p-1">
  <div class="overlay is-right px-2 pt-1">
    <div>
      <span style="display:inline-block">
        <progress
          class:is-danger={localFuelLevel < 25}
          class:flashing={localFuelLevel < 25}
          class:is-success={localFuelLevel >= 25}
          class="progress m-0 is-small"
          value={localFuelLevel}
          max="100"
        />
        <div class="columns is-mobile is-size-7 has-text-primary">
          <div class="column is-narrow">
            Fuel: {localFuelLevel.toFixed(0)}
          </div>
          <div class="column is-float-right">
            Difficulty: {$difficulty.toFixed(0)}
          </div>
        </div>
      </span>
      <span class="pl-2">
        <Button
          text="LAUNCH"
          color="is-success"
          onClick={() => {
            $userLogs = [];
            $userPlots = [];
            runLanderToggle();
          }}
        />
      </span>
      <span class="pl-2">
        <Button
          text="RESET"
          color="is-light"
          onClick={() => {
            resetLanderToggle();
            traceBack = "";
          }}
        />
      </span>
    </div>
    <div class="mt-2 is-flex">
      <span class="ml-auto">
        <IncDecButton
          text="LANDERS"
          color="is-info"
          countCallback={(localNumLanders) => ($numLanders = localNumLanders)}
          count={$numLanders}
          max={25}
        />
      </span>
    </div>
  </div>

  <div class="overlay is-left is-bottom is-fullwidth">
    <div class="columns is-mobile p-2">
      <div class="column">
        <div class:is-hidden={traceBack == ""} class={"err p-1"}>
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
      <Ground color="#dee2e6" ground_pix_per_seg={5} ground_noise={10} />
      <Lander />
    </Background>
  </Canvas>
</div>

<style>
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

  .flashing {
    animation: flashing 0.4s linear infinite;
  }

  @keyframes flashing {
    50% {
      box-shadow: 0 0 10px 5px red;
    }
  }

  .err {
    background-color: darkred;
    opacity: 0.9;
    color: white;
    border-radius: 0.5rem;
  }
</style>
