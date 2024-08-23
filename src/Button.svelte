<script lang="ts">
  export let text = "LAUNCH";
  export let color = "is-white";
  export let onClick = () => {};
</script>

<button class="button is-small {color}" on:click={onClick}>{text}</button>
