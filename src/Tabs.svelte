<script lang="ts">
  import { onMount } from "svelte";
  import type { CoordinateSpace } from "./render";
  import { TW, outerAppPadding } from "./render";

  export let items = [];
  export let activeTabValue = 1;

  const handleClick = (tabValue: number) => () => (activeTabValue = tabValue);

  let tw: CoordinateSpace = { height: 30, width: 30, x: 0, y: 0 };
  let headerHeight: number;

  function handleResize() {
    tw.height = window.innerHeight - 2 * outerAppPadding - headerHeight;
    tw.width = window.innerWidth - 2 * outerAppPadding;
    $TW = tw;
  }

  onMount(() => {
    handleResize();
  });
</script>

<div
  class="outerContainer is-fullwidth is-fullheight"
  style="padding:{outerAppPadding}px"
>
  <div class="columns is-mobile mb-0">
    <div class="column is-narrow pb-0">
      <ul bind:clientHeight={headerHeight}>
        {#each items as item}
          <li class:active={activeTabValue === item.value} class="pr-1">
            <menuitem on:click={handleClick(item.value)}>{item.label}</menuitem>
          </li>
        {/each}
      </ul>
    </div>
  </div>

  <div class="tabBox" style="width:{tw.width}px; height:{tw.height}px;">
    {#each items as item}
      {#if activeTabValue == item.value}
        <svelte:component this={item.component} />
      {/if}
    {/each}
  </div>
</div>

<svelte:window on:resize|passive={handleResize} />

<style>
  .outerContainer {
    box-sizing: border-box;
  }

  .tabBox {
    padding: 0px;
    margin: 0px;
    box-sizing: border-box;
    border: 1px solid #dee2e6;
    border-radius: 0 0.5rem 0.5rem 0.5rem;
  }

  ul {
    display: flex;
    flex-wrap: wrap;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    margin-bottom: -1px;
    color: white;
  }

  menuitem {
    border: 1px solid #495057;
    border-bottom-color: #dee2e6;
    border-radius: 0.25rem 0.25rem 0 0;
    display: block;
    padding: 0.5rem 1rem;
    cursor: pointer;
  }

  menuitem:hover {
    border-color: #dee2e6;
  }

  li.active > menuitem {
    color: #495057;
    background-color: #dee2e6;
    border-color: #dee2e6;
  }
</style>
