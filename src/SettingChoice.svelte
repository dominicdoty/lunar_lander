<script lang="ts">
  import type { Writable } from "svelte/store";
  import type { Options } from "./settings";

  export let choices;
  export let store: Writable<Options>;
  export let key: string;
</script>

{#each Object.entries(choices) as [choice, scenario]}
  <div class="column is-narrow">
    <button
      class="button {$store[key] == choice ? 'is-success' : 'is-dark'}"
      on:click={() => {
        store.update((opts) => {
          Object.assign(opts, scenario);
          opts[key] = choice;
          return opts;
        });
      }}>{choice}</button
    >
  </div>
{/each}
