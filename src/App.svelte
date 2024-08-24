<script>
  import "./global.css";
  import Tabs from "./Tabs.svelte";
  import { urlDecodeSettings } from "./settings";
  import { onMount } from "svelte";
  import { userCode, userCodeFunction } from "./render";

  // Decode settings on load
  onMount(() => {
    urlDecodeSettings();
    try {
      if ($userCode != "") {
        let f = Function($userCode);
        $userCodeFunction = f;
      }
    } catch (error) {}
  });

  let items = [
    { label: "Launch", value: 1, component: "./LanderTab.svelte" },
    { label: "Editor", value: 2, component: "./Editor.svelte" },
    { label: "Options", value: 3, component: "./OptionsTab.svelte" },
  ];
</script>

<Tabs {items} />
