<script lang="ts">
  export let description: string;
  export let descriptionColWidth: string = "is-4";
</script>

<div class="columns settingdiv is-multiline">
  {#if description}
    <div class="column {descriptionColWidth}">{description}</div>
  {/if}
  <slot />
</div>

<style>
  .settingdiv {
    margin: 3px;
    border: 1px;
    background-color: hsl(0, 0%, 10%);
    border-color: white;
    border-style: solid;
    border-radius: 5px;
  }
</style>
