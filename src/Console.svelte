<script>
  import { slide } from "svelte/transition";
  import { userLogs } from "./render";

  let isExpanded = false;

  let resizing = false;
  let initialX = null;
  let startingWidth = 200;
  let width = startingWidth;
</script>

<svelte:window
  on:mouseup={() => {
    if (resizing) {
      resizing = false;
    }
  }}
  on:mousemove={(event) => {
    if (resizing) {
      const delta = initialX - event.pageX;
      width = startingWidth - delta;
    }
  }}
/>

{#if isExpanded}
  <div
    class="left-dock"
    style="width:{width}px"
    transition:slide={{ duration: 300, axis: "x" }}
  >
    <div class="columns is-mobile is-gapless is-fullheight">
      <div class="column">
        <div
          class="console has-background-primary"
          on:click={() => (isExpanded = false)}
          on:keypress={() => (isExpanded = false)}
        >
          <div class="table is-fullwidth is-hoverable p-1">
            <thead>
              <tr>
                <th>Idx</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {#each $userLogs as [idx, log]}
                <tr>
                  <td>{idx}</td>
                  <td>{log}</td>
                </tr>
              {/each}
            </tbody>
          </div>
        </div>
      </div>
      <div class="column is-narrow">
        <div
          class="drag-affordance"
          on:mousedown={(event) => {
            resizing = true;
            initialX = event.pageX;
            startingWidth = width;
          }}
        ></div>
      </div>
    </div>
  </div>
{:else}
  <div class="left-dock">
    <div class="bump-out">
      <div
        class="p-1"
        on:click={() => (isExpanded = true)}
        on:keypress={() => (isExpanded = true)}
      >
        Console ↥
      </div>
    </div>
  </div>
{/if}

<style>
  .left-dock {
    position: absolute;
    top: 0px;
    left: 0px;
    z-index: 1;
    height: 100%;
  }

  .bump-out {
    /* Style */
    background-color: #dee2e6;
    border-radius: 0 0.5rem 0.5rem 0;
    writing-mode: vertical-lr;
    cursor: pointer;

    /* Center Vertically */
    margin: 0;
    position: absolute;
    top: 50%;
    -ms-transform: translateY(-50%);
    transform: translateY(-50%);
  }

  .drag-affordance {
    background-color: #15191e;
    cursor: pointer;
    outline: 1px solid #dee2e6;
    width: 6px;
    height: 3em;
    z-index: 2;
    position: absolute;
    right: -3px;
    top: 50%;
    -ms-transform: translateY(-50%);
    transform: translateY(-50%);
  }

  .console {
    height: 100%;
    padding-right: 5px;
    color: #dee2e6;
    overflow-wrap: anywhere;
    overflow: scroll;
    border-radius: 0 0.5rem 0.5rem 0.5rem;
    border-right: 1px solid #dee2e6;
  }
</style>
