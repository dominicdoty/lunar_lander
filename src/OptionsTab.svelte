<script lang="ts">
  import BlobInput from "./BlobInput.svelte";
  import { runLander } from "./render";
  import Setting from "./Setting.svelte";
  import SettingChoice from "./SettingChoice.svelte";
  import SettingInput from "./SettingInput.svelte";
  import { options } from "./settings";

  // Stop lander running when we go back to launch tab
  $runLander = false;

  let scenarioChoices = {
    Vertical: {
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
    },
    Rotated: {
      enableFuel: false,
      enableFuelMass: false,
      startingAltitude: 500,
      startingX: -1,
      startingAngle: 0,
      startingAngleRandomize: true,
      startingAngleRandomizeAngle: 10,
      velocityVectorAngle: 0,
      velocityVectorMagnitude: 0,
      velocityVectorRandomize: false,
      velocityVectorRandomizeAngle: 0,
      velocityVectorRandomizeMagnitude: 0,
      rotationalVelocity: 0,
      rotationalVelocityRandomize: false,
      rotationalVelocityRandomizeMagnitude: 0,
      groundVariability: 100,
    },
    Ballistic: {
      enableFuel: true,
      enableFuelMass: true,
      startingAltitude: 500,
      startingX: 20,
      startingAngle: -90,
      startingAngleRandomize: true,
      startingAngleRandomizeAngle: 10,
      velocityVectorAngle: 90,
      velocityVectorMagnitude: 4,
      velocityVectorRandomize: true,
      velocityVectorRandomizeAngle: 5,
      velocityVectorRandomizeMagnitude: 0.5,
      rotationalVelocity: 0.5,
      rotationalVelocityRandomize: true,
      rotationalVelocityRandomizeMagnitude: 0.1,
      groundVariability: 100,
    },
    "Tumbling Ballistic": {
      enableFuel: true,
      enableFuelMass: true,
      startingAltitude: 500,
      startingX: 20,
      startingAngle: -90,
      startingAngleRandomize: true,
      startingAngleRandomizeAngle: 180,
      velocityVectorAngle: 90,
      velocityVectorMagnitude: 2,
      velocityVectorRandomize: true,
      velocityVectorRandomizeAngle: 70,
      velocityVectorRandomizeMagnitude: 2,
      rotationalVelocity: 0,
      rotationalVelocityRandomize: true,
      rotationalVelocityRandomizeMagnitude: 3,
      groundVariability: 200,
    },
  };
</script>

<div class="textdiv">
  <div class="columns">
    <div class="column p-0">
      <Setting description="Scenario" descriptionColWidth="">
        <SettingChoice
          store={options}
          key="scenario"
          choices={scenarioChoices}
        />
      </Setting>
      <Setting description="Enable Limited Fuel">
        <SettingInput inputType="boolean" store={options} key="enableFuel" />
      </Setting>
      <Setting description="Enable Fuel Mass">
        <SettingInput
          inputType="boolean"
          store={options}
          key="enableFuelMass"
        />
      </Setting>
      <Setting description="Starting Altitude">
        <SettingInput
          inputType="number"
          store={options}
          key="startingAltitude"
          placeholder="Altitude"
        />
      </Setting>
      <Setting description="Starting X Position">
        <SettingInput
          inputType="number"
          store={options}
          key="startingX"
          placeholder="X Pos"
        />
      </Setting>
      <Setting description="Starting Angle">
        <SettingInput
          inputType="number"
          store={options}
          key="startingAngle"
          placeholder="Angle (deg)"
        />
      </Setting>
      <Setting description="Randomize Starting Angle">
        <SettingInput
          inputType="number"
          store={options}
          key="startingAngleRandomizeAngle"
          placeholder="Angle (deg)"
          enableKey="startingAngleRandomize"
        />
        <SettingInput
          inputType="boolean"
          store={options}
          key="startingAngleRandomize"
        />
      </Setting>
    </div>
    <div class="column p-0">
      <Setting description="Starting Velocity Vector">
        <SettingInput
          inputType="number"
          store={options}
          key="velocityVectorAngle"
          placeholder="Angle (deg)"
        />
        <SettingInput
          inputType="number"
          store={options}
          key="velocityVectorMagnitude"
          placeholder="Magnitude"
        />
      </Setting>
      <Setting description="Randomize Velocity Vector">
        <SettingInput
          inputType="number"
          store={options}
          key="velocityVectorRandomizeAngle"
          placeholder="Angle (deg)"
          enableKey="velocityVectorRandomize"
        />
        <SettingInput
          inputType="number"
          store={options}
          key="velocityVectorRandomizeMagnitude"
          placeholder="Magnitude"
          enableKey="velocityVectorRandomize"
        />
        <SettingInput
          inputType="boolean"
          store={options}
          key="velocityVectorRandomize"
        />
      </Setting>
      <Setting description="Starting Rotational Velocity">
        <SettingInput
          inputType="number"
          store={options}
          key="rotationalVelocity"
          placeholder="Magnitude"
        />
      </Setting>
      <Setting description="Randomize Rotational Velocity">
        <SettingInput
          inputType="number"
          store={options}
          key="rotationalVelocityRandomizeMagnitude"
          placeholder="Magnitude"
          enableKey="rotationalVelocityRandomize"
        />
        <SettingInput
          inputType="boolean"
          store={options}
          key="rotationalVelocityRandomize"
        />
      </Setting>
      <Setting description="Generated Ground Variability">
        <SettingInput
          inputType="number"
          store={options}
          key="groundVariability"
          placeholder="Magnitude"
        />
      </Setting>
      <Setting description="Generated Ground Seed">
        <SettingInput
          inputType="string"
          store={options}
          key="groundSeed"
          placeholder="Any random word or phrase"
          onInputCallback={() => {}}
        />
      </Setting>
      <Setting description="Settings Blob">
        <BlobInput
          store={options}
          placeholder="Current Settings Encoded as a Shareable String"
        />
      </Setting>
    </div>
  </div>
</div>

<style>
  .textdiv {
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    position: relative;
    padding: 20px;
    color: white;
  }
</style>
