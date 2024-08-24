<script lang="ts">
  export let keys: Array<string>;
  export let action: Function;

  let keyDownState = new Array(keys.length).fill(false);
  let debounceNeeded = false;

  function keydown(event: KeyboardEvent) {
    let idx = keys.indexOf(event.key);
    if (idx != -1) {
      keyDownState[idx] = true;
      if (!debounceNeeded && keyDownState.every((v) => v === true)) {
        action();
        debounceNeeded = true;
      }
    }
  }

  function keyup(event: KeyboardEvent) {
    let idx = keys.indexOf(event.key);
    if (idx != -1) {
      keyDownState[idx] = false;
      debounceNeeded = false;
    }
  }
</script>

<svelte:window on:keydown={keydown} on:keyup={keyup} />
