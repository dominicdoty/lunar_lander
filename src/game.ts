import { getContext, onMount } from "svelte";
import { writable, derived } from "svelte/store";
import type { Line } from "./types";

// View Window
export const width = writable(window.innerWidth);
export const height = writable(window.innerHeight);
export const pixelRatio = writable(window.devicePixelRatio);

// Canvas
export const context = writable();
export const canvas = writable();
export const time = writable(0);

// Lander Tab
export const gground = writable([[0, 0]] as Line);
export const launchError = writable("" as any);
export const regenerateGround = writable(false);

// A more convenient store for grabbing all game props
export const props = deriveObject({
  context,
  canvas,
  width,
  height,
  pixelRatio,
  time,
});

export const key = Symbol();

export const getState = () => {
  const api = getContext(key);
  return api.getState();
};

export const renderable = (render) => {
  const api = getContext(key);
  const element = {
    ready: false,
    mounted: false,
  };
  if (typeof render === "function") {
    element.render = render;
  } else if (render) {
    if (render.render) element.render = render.render;
    if (render.setup) element.setup = render.setup;
  }
  api.add(element);
  onMount(() => {
    element.mounted = true;
    return () => {
      api.remove(element);
      element.mounted = false;
    };
  });
};

function deriveObject(obj) {
  const keys = Object.keys(obj);
  const list = keys.map((key) => {
    return obj[key];
  });
  return derived(list, (array) => {
    return array.reduce((dict, value, i) => {
      dict[keys[i]] = value;
      return dict;
    }, {});
  });
}
