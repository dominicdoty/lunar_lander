<script lang="ts">
  import { runNoConsole } from "./helper";
  import { userCodeFunction, runLander, userCode } from "./render";
  import initialCode from "./default_editor_contents.js?raw";

  import CodeMirror from "svelte-codemirror-editor";
  import { javascript } from "@codemirror/lang-javascript";
  import { barf as codetheme } from "thememirror";

  import { js_beautify } from "js-beautify";

  // Stop lander running when we go back to launch tab
  $runLander = false;

  let codeText = "";
  let traceBack = "";

  // Set the store if it hasn't been yet
  if ($userCode == "") {
    $userCode = initialCode;
  }

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
        });

        if (!("rotThrust" in userReturn)) {
          throw new Error("rotThrust missing from return object!");
        }
        if (!("aftThrust" in userReturn)) {
          throw new Error("aftThrust missing from return object!");
        }
        if (!("userStore" in userReturn)) {
          throw new Error("userStore missing from return object!");
        }
      }

      traceBack = "";

      $userCodeFunction = f;
    } catch (error) {
      if (error instanceof Error) {
        error = error as Error;
        traceBack = `${error.lineNumber}:${error.columnNumber} Error: ${error.message}`;
      } else {
        traceBack = `Unknown error ${error}`;
      }
    }
  });
</script>

<div class="textdiv p-4">
  <div class="buttonoverlay p-2">
    <button
      class="button"
      on:click={() => {
        codeText = js_beautify(codeText);
        $userCode = codeText;
      }}>Autoformat</button
    >
  </div>

  <CodeMirror
    bind:value={codeText}
    on:change={() => ($userCode = codeText)}
    theme={codetheme}
    lang={javascript()}
  />

  {#if traceBack != ""}
    <div class="erroroverlay">
      <div class="p-3">{traceBack}</div>
    </div>
  {/if}
</div>

<style>
  .textdiv {
    min-height: 100%;
    width: 100%;
    margin-bottom: 1em;
    background-color: #15191e;
    box-sizing: border-box;
    position: relative;
    outline: 1px solid #dee2e6;
    border-radius: 0 0.5rem 0.5rem 0.5rem;
  }

  .buttonoverlay {
    right: 0px;
    top: 0px;
    z-index: 10;
    position: absolute;
  }

  .erroroverlay {
    left: 0px;
    bottom: 0px;
    width: 100%;
    position: absolute;
    background-color: darkred;
    border-radius: 0 0 0.5rem 0.5rem;
    opacity: 0.9;
    color: white;
  }
</style>
