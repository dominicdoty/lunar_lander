<script lang="ts">
  export let text = "";
  export let color = "is-white";
  export let countCallback = (count: number) => {};
  export let count = 1;
  export let max = 5;
  export let min = 1;
</script>

<div class="buttons has-addons">
  <button
    class="button is-small px-2 {color}"
    on:click={() => {
      if (count > min) {
        count -= 1;
        countCallback(count);
      }
    }}
    disabled={count == min}
  >
    &DownArrow;
  </button>
  <button class="button is-small is-static is-outlined {color}">
    {count}x
    {text}
  </button>
  <button
    class="button is-small px-2 {color}"
    on:click={() => {
      if (count < max) {
        count += 1;
        countCallback(count);
      }
    }}
    disabled={count == max}
  >
    &UpArrow;
  </button>
</div>
