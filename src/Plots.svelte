<script lang="ts">
  import c3 from "c3";
  import { onMount } from "svelte";
  import { writable } from "svelte/store";
  import { runLander, userPlots } from "./render";

  // Stop lander running when we go back to launch tab
  $runLander = false;

  let dataVars;

  userPlots.subscribe((v) => {
    if (v.length > 0) {
      dataVars = [];
      for (let k of Object.keys(v[0])) {
        if (k != "time") {
          dataVars.push(k);
        }
      }
    } else {
      dataVars = [];
    }
  });

  // Create the Chart
  let chart;
  let plotArea;
  let plotAreaSizeDeltas = { height: 0, width: 0 };
  let textDivDimensions = writable({ width: 0, height: 0 });

  onMount(() => {
    chart = c3.generate({
      bindto: "#plotarea",
      data: {
        json: $userPlots,
        keys: {
          value: dataVars,
        },
      },
      axis: {
        time: {},
        y2: {
          show: true,
        },
      },
      tooltip: {
        show: false,
      },
      point: {
        show: false,
      },
      padding: {
        top: 5, // this keeps the scale from clipping
      },
    });

    // No official method for this so hacked this one in
    chart.showAxes = (axis, show) => {
      chart.internal.axes[axis].style(
        "visibility",
        show ? "visible" : "hidden"
      );
      chart.internal.redraw();
    };

    // Hacky hide the Y2 axis here since we default to not using it
    // seems like you have to include it in initial plot to get it to size correctly
    chart.showAxes("y2", false);

    plotAreaSizeDeltas.width = $textDivDimensions.width - plotArea.clientWidth;
    plotAreaSizeDeltas.height =
      $textDivDimensions.height - plotArea.clientHeight;
  });

  let varYside = writable(Object.fromEntries(dataVars.map((v) => [v, "y"])));

  varYside.subscribe((state) => {
    if (chart) {
      // Check if we need to show the Axes
      if (Object.values(state).some((item) => item == "y")) {
        chart.showAxes("y", true);
      }
      if (Object.values(state).some((item) => item == "y2")) {
        chart.showAxes("y2", true);
      }

      // Move Axes
      chart.data.axes(state);

      // Show/Hide Everyone
      let hideData = Object.keys(
        Object.fromEntries(
          Object.entries(state).filter(([variable, axis]) => axis == "")
        )
      );
      chart.hide(hideData);

      let showData = Object.keys(
        Object.fromEntries(
          Object.entries(state).filter(([variable, axis]) => axis != "")
        )
      );
      chart.show(showData);

      // Check if we need to hide the Axes
      if (Object.values(state).every((item) => item != "y")) {
        chart.showAxes("y", false);
      }
      if (Object.values(state).every((item) => item != "y2")) {
        chart.showAxes("y2", false);
      }
    }
  });

  let actButton = (variable, axis: string) => {
    if ($varYside[variable] == axis) {
      return "is-success";
    } else {
      return "";
    }
  };

  textDivDimensions.subscribe((totalDiv) => {
    if (chart) {
      chart.resize({
        height: totalDiv.height - plotAreaSizeDeltas.height,
        width: totalDiv.width - plotAreaSizeDeltas.width,
      });
    }
  });
</script>

<div
  class="is-rel-borderbox is-fullheight has-text-primary p-4"
  bind:clientWidth={$textDivDimensions.width}
  bind:clientHeight={$textDivDimensions.height}
>
  <div class="columns is-mobile is-fullheight">
    <!-- Plotting Area -->
    <div class="column">
      <div class="is-fullheight outlined p-3">
        <div
          class="is-fullheight plotarea"
          bind:this={plotArea}
          id="plotarea"
        ></div>
      </div>
    </div>

    <!-- Variable Plotting Enable Column -->
    <div class="column is-narrow">
      <div class="panel is-fullheight is-primary has-text-centered outlined">
        <p class="panel-heading">Variables</p>

        <div class="panel-block">
          <div class="is-fullwidth">
            <div class="columns is-mobile">
              <div class="column">L</div>
              <div class="column">Var</div>
              <div class="column">R</div>
            </div>
          </div>
        </div>

        {#each Object.keys($varYside) as variable}
          <div class="panel-block">
            <div class="is-fullwidth">
              <label class="checkbox is-fullwidth">
                <div class="columns is-mobile has-text-centered">
                  <div class="column is-narrow">
                    <button
                      class="button p-1 lil-button {actButton(variable, 'y')}
                      "
                      on:click={() => {
                        if ($varYside[variable] != "y") {
                          $varYside[variable] = "y";
                        } else {
                          $varYside[variable] = "";
                        }
                      }}>L</button
                    >
                  </div>
                  <div class="column">{variable}</div>
                  <div class="column is-narrow">
                    <button
                      class="button p-1 lil-button {actButton(variable, 'y2')}"
                      on:click={() => {
                        if ($varYside[variable] != "y2") {
                          $varYside[variable] = "y2";
                        } else {
                          $varYside[variable] = "";
                        }
                      }}>R</button
                    >
                  </div>
                </div>
              </label>
            </div>
          </div>
        {/each}

        <!-- This is just here to provide a line at the bottom -->
        <div class="panel-block"></div>
      </div>
    </div>
  </div>
</div>

<style>
  .lil-button {
    height: 1.5em;
    width: 1.5em;
  }

  .plotarea {
    fill: #dee2e6;
  }

  .outlined {
    outline: 1px solid #dee2e6;
    border-radius: 6px;
  }

  :global(.c3-chart-line) {
    fill: transparent;
  }
</style>
