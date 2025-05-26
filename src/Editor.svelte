<script lang="ts">
  import {
    runNoConsole,
    initialFromOptions,
    randomizeInitialFromOptions,
  } from "./utils";
  import { userCodeFunction, runLander, userCode, VW } from "./render";
  import { options } from "./settings";
  import Hotkey from "./Hotkey.svelte";

  import CodeMirror from "svelte-codemirror-editor";
  import type { EditorView } from "@codemirror/view";
  import { javascript } from "@codemirror/lang-javascript";
  import { barf as codetheme } from "thememirror";
  import { js_beautify } from "js-beautify";
  import { fuelCapacity, LanderPhysics } from "./lander";
  import { gground } from "./game";

  // Stop lander running when we go back to launch tab
  $runLander = false;

  let testLander = new LanderPhysics(
    initialFromOptions($options, $gground, fuelCapacity, $VW),
    () => {},
    $options.enableFuel,
    $options.enableFuelMass,
    $options.allowableAftThrottle,
    $options.allowableRotThrottle,
    $gground,
    randomizeInitialFromOptions($options)
  );
  testLander.enablePlotting = false;
  testLander.enableLogging = false;

  let codeText = "";
  let traceBack = "";

  let plotTest = (data: {}) => {
    // check for validity here
    if (typeof data !== "object") {
      throw new Error(
        "Data supplied to plot function does not appear to be an object. Expect {my_var:0}"
      );
    } else {
      for (let [k, v] of Object.entries(data)) {
        if (typeof k !== "string") {
          throw new Error("All plot data keys expected to be strings");
        } else if (typeof v !== "number") {
          throw new Error("All plot data values expected to be numbers");
        } else if (k == "time") {
          throw new Error(
            "The key name 'time' is already used and cannot be used in your plot data"
          );
        }
      }
    }
  };

  // Set our value from the store
  codeText = $userCode;

  // Watch for updates to userCode and set function
  userCode.subscribe((code: string) => {
    traceBack = "";
    let error: Error = null;
    let userFunc = null;

    try {
      userFunc = Function(code);
      testLander.userAutoPilot = userFunc;

      let landerStep = () => {
        testLander.stepAutopilot(testLander.stateHist.at(-1));
      };

      for (let i = 0; i < 4; i++) {
        runNoConsole(landerStep, null);

        if (testLander.error) {
          error = testLander.error;
          traceBack = `${error}`;
          break;
        }
      }
    } catch (thrownError) {
      error = thrownError;
      traceBack = `${error}`;
    }

    if (!error) {
      $userCodeFunction = userFunc;
    } else {
      $userCodeFunction = () => {
        throw error;
      };
    }

    // reset testLander state
    testLander.stateHist = [testLander.stateHist[0]];
    testLander.userStore = {};
    testLander.isAboveGround = true;
    testLander.crashed = false;
    testLander.error = null;
  });

  // Attached to CodeMirror object to allow us to attempt to reset
  // cursor location after formatting
  let view: EditorView;

  function autoformat() {
    let oldPos = view.state.selection.ranges[0].from;
    let oldLen = view.state.doc.length;

    // Format and update displayed/stored code
    let fmtText = js_beautify(codeText, { indent_size: 2 });
    $userCode = fmtText;
    view.dispatch({ changes: { from: 0, to: oldLen, insert: fmtText } });

    // Attempt to reset cursor position
    view.focus();
    view.dispatch({ selection: { anchor: oldPos, head: oldPos } });
  }
</script>

<!-- Attach ctrl+shift+F to autoformat -->
<Hotkey keys={["Control", "Shift", "F"]} action={autoformat} />

<div class="textdiv is-rel-borderbox is-fullwidth p-4">
  <div class="format-button-overlay p-1">
    <div class="columns">
      <div class="column"></div>
      {#if traceBack != ""}
        <div class="column error-message p-3 m-1 is-narrow">
          {traceBack}
        </div>
      {/if}
      <!-- <li class="m-1"> -->
      <div class="column is-narrow p-1">
        <button class="button" title="ctrl+shift+F" on:click={autoformat}>
          Autoformat
        </button>
      </div>
    </div>
  </div>

  <CodeMirror
    bind:value={codeText}
    on:change={() => ($userCode = codeText)}
    on:ready={(e) => (view = e.detail)}
    theme={codetheme}
    lang={javascript()}
  />
</div>

<style>
  .textdiv {
    min-height: 100%;
    margin-bottom: 1em;
    background-color: #15191e;
    outline: 1px solid #dee2e6;
    border-radius: 0 0.5rem 0.5rem 0.5rem;
  }

  .format-button-overlay {
    z-index: 10;
    right: 0px;
    top: 10px;
    position: sticky;
  }

  .error-message {
    background-color: darkred;
    border-radius: 0.5rem;
    line-height: 1em;
    opacity: 0.8;
    color: white;
  }
</style>
