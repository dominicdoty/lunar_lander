<script lang="ts">
  import type { Writable } from "svelte/store";
  import type { Options } from "./settings";
  import { onMount } from "svelte";
  import { makeNumber } from "./utils";

  export let inputType: string;
  export let store: Writable<Options>;
  export let key: string;
  export let enableKey: string = undefined;
  export let placeholder: string = "";
  export let onInputCallback: () => void = () => {
    $store.scenario = "";
  };

  let enabled: boolean = true;
  let domObj: HTMLInputElement;

  onMount(() => {
    if (domObj) {
      domObj.value = $store[key];
    }

    if (enableKey) {
      store.subscribe((opts) => {
        enabled = opts[enableKey];
      });
    }
  });
</script>

{#if inputType == "boolean"}
  <div class="column is-float-right">
    <button
      class="button {$store[key] ? 'is-success' : 'is-dark'}"
      on:click={() => {
        onInputCallback();
        store.update((opts) => {
          opts[key] = !opts[key];
          return opts;
        });
      }}>Enable</button
    >
  </div>
{/if}
{#if inputType == "number"}
  <div class="column is-3">
    <input
      class="input"
      type="text"
      {placeholder}
      title={placeholder}
      bind:this={domObj}
      bind:value={$store[key]}
      on:input={() => {
        onInputCallback();
        domObj.classList.remove("is-danger");

        if (isNaN(parseFloat(domObj.value))) {
          domObj.classList.add("is-danger");
        } else {
          store.update((opts) => {
            let value = makeNumber(domObj.value, $store.defaults[key]);
            opts[key] = value;
            return opts;
          });
        }
      }}
      disabled={!enabled}
    />
  </div>{/if}
{#if inputType == "string"}
  <div class="column">
    <input
      class="input"
      type="text"
      {placeholder}
      title={placeholder}
      bind:this={domObj}
      bind:value={$store[key]}
      on:input={() => {
        onInputCallback();
        store.update((opts) => {
          opts[key] = domObj.value;
          return opts;
        });
      }}
    />
  </div>{/if}
