<script lang="ts">
  import { validateUserReturn, runNoConsole } from "./utils";
  import { userCodeFunction, runLander, userCode } from "./render";
  import { options } from "./settings";
  import Hotkey from "./Hotkey.svelte";

  import CodeMirror from "svelte-codemirror-editor";
  import type { EditorView } from "@codemirror/view";
  import { javascript } from "@codemirror/lang-javascript";
  import { barf as codetheme } from "thememirror";
  import { js_beautify } from "js-beautify";

  // Stop lander running when we go back to launch tab
  $runLander = false;

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
    try {
      let f = Function(code);

      // Run a few times
      // This ensures runtime errors are caught
      // Even when hidden behind an early return in the first iterations
      let tmpUserStore = {};
      for (let i = 0; i < 4; i++) {
        let userReturn = runNoConsole(f, {
          x_position: 50,
          altitude: 500,
          angle: 0,
          userStore: tmpUserStore,
          log: () => {},
          plot: plotTest,
        });

        validateUserReturn(
          userReturn,
          $options.allowableAftThrottle,
          $options.allowableRotThrottle
        );
      }

      traceBack = "";

      $userCodeFunction = f;
    } catch (error) {
      if (error instanceof Error) {
        traceBack = `Error: ${error.message}`;
      } else {
        traceBack = `Unknown error ${error}`;
      }
    }
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
