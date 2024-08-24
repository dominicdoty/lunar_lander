<script>
  import "./global.css";
  import LanderTab from "./LanderTab.svelte";
  import Editor from "./Editor.svelte";
  import OptionsTab from "./OptionsTab.svelte";
  import Plots from "./Plots.svelte";
  import Tabs from "./Tabs.svelte";
  import { urlDecodeSettings } from "./settings";
  import { onMount } from "svelte";
  import { userCode, userCodeFunction } from "./render";

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
    { label: "Launch", value: 1, component: LanderTab },
    { label: "Editor", value: 2, component: Editor },
    { label: "Options", value: 3, component: OptionsTab },
    { label: "Plots", value: 4, component: Plots },
  ];
</script>

<Tabs {items} />
