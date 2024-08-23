<script lang="ts">
  import { runNoConsole } from "./helper";
  import { userCodeFunction, runLander, userCode } from "./render";

  import CodeMirror from "svelte-codemirror-editor";
  import { javascript } from "@codemirror/lang-javascript";
  import { barf as codetheme } from "thememirror";

  // Stop lander running when we go back to launch tab
  $runLander = false;

  const initialCode =
    `// Arguments:\n` +
    `let {x_position, altitude, angle, userStore} = arguments[0];\n` +
    `\n` +
    `// Example of how to initialize user storage\n` +
    `if (!("store" in userStore)) {\n` +
    `  userStore.store = 0;\n` +
    `}\n` +
    `\n` +
    `// Return:\n` +
    `return { rotThrust:0, aftThrust:0, userStore:userStore };\n`;

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
