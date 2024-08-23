<script lang="ts">
  import type { Writable } from "svelte/store";
  import { blobToSettings, settingsToBlob, type Options } from "./settings";
  import { onMount } from "svelte";
  import { userCode } from "./render";

  export let store: Writable<Options>;
  export let placeholder: string = "";

  let includeCode: boolean;
  let domObj: HTMLInputElement;

  store.subscribe((opts) => {
    if (domObj) {
      domObj.value = settingsToBlob(opts, includeCode ? $userCode : "");
      domObj.classList.remove("is-primary", "is-danger");
    }
  });

  let updateBlob = () => {
    domObj.value = settingsToBlob($store, includeCode ? $userCode : "");
  };

  onMount(() => {
    updateBlob();
  });
</script>

<div class="column is-narrow">
  <input
    type="checkbox"
    title="Include Code in Settings Blob"
    bind:checked={includeCode}
    on:change={updateBlob}
  /> Code
</div>
<div class="column">
  <input
    class="input"
    type="text"
    {placeholder}
    title={placeholder}
    bind:this={domObj}
    on:input={() => {
      try {
        domObj.classList.remove("is-primary", "is-danger");
        blobToSettings(domObj.value);
        domObj.classList.add("is-primary");
      } catch {
        domObj.classList.add("is-danger");
      }
    }}
  />
</div>
