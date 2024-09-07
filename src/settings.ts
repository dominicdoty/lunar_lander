import { writable } from "svelte/store";
import { strToU8, strFromU8, compressSync, decompressSync } from "fflate";
import { reSeedGround } from "./ground_utils";
import { userCode } from "./render";

// Options
export class Options {
  enableFuel: boolean;
  enableFuelMass: boolean;
  startingAltitude: number;
  startingX: number;
  startingAngle: number;
  startingAngleRandomize: boolean;
  startingAngleRandomizeAngle;
  velocityVectorAngle: number;
  velocityVectorMagnitude: number;
  velocityVectorRandomize: boolean;
  velocityVectorRandomizeAngle: number;
  velocityVectorRandomizeMagnitude: number;
  rotationalVelocity: number;
  rotationalVelocityRandomize: boolean;
  rotationalVelocityRandomizeMagnitude: number;
  groundVariability: number;
  groundSeed: string;
  thrusters: string;
  allowableAftThrottle: Array<Array<number>>;
  allowableRotThrottle: Array<Array<number>>;
  scenario: string;

  defaults = {
    enableFuel: false,
    enableFuelMass: false,
    startingAltitude: 500,
    startingX: -1,
    startingAngle: 0,
    startingAngleRandomize: false,
    startingAngleRandomizeAngle: 0,
    velocityVectorAngle: 0,
    velocityVectorMagnitude: 0,
    velocityVectorRandomize: false,
    velocityVectorRandomizeAngle: 0,
    velocityVectorRandomizeMagnitude: 0,
    rotationalVelocity: 0,
    rotationalVelocityRandomize: false,
    rotationalVelocityRandomizeMagnitude: 0,
    groundVariability: 100,
    groundSeed: reSeedGround(),
    thrusters: "No Limitations",
    allowableAftThrottle: [[0.0, 1.0]],
    allowableRotThrottle: [[0.0, 1.0]],
    scenario: "Vertical",
  };

  constructor() {
    Object.assign(this, this.defaults);
  }
}

// Stores
export const options = writable(new Options());

// Blob Ops
export function blobToSettings(stringBlob: string): Options {
  // Decode and decompress
  let json = strFromU8(decompressSync(strToU8(atob(stringBlob), true)), true);
  let opts = JSON.parse(json);

  // Check for code and remove if necessary
  if ("code" in opts) {
    let { code, ...newopts } = opts;
    opts = newopts;
    userCode.set(code);
  }

  let newopts = new Options();

  // Remove any unrecognized or default options from opts
  for (let prop in opts) {
    if (
      !(prop in newopts.defaults) ||
      !(typeof newopts[prop] == typeof opts[prop]) ||
      newopts[prop] == opts[prop]
    ) {
      delete opts[prop];
    }
  }

  // Update new options object with the new option settings
  Object.assign(newopts, opts);

  // Set store
  options.set(newopts);
}

export function settingsToBlob(options: Options, code: string = "") {
  if (code != "") {
    options["code"] = code;
  }

  let jsonOptions = JSON.stringify(options);
  let opts = btoa(
    strFromU8(
      compressSync(strToU8(jsonOptions, true), { level: 9, mem: 8 }),
      true
    )
  );

  // Update URL so it can be shared with the code state
  window.history.replaceState({ page: 1 }, "Lunar Pilot", "/" + opts);

  return opts;
}

export function urlDecodeSettings() {
  let blob = window.location.pathname.substring(1);
  if (blob) {
    blobToSettings(blob);
  }
}
