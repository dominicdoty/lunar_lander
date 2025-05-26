import type {
  LanderState,
  LanderStateTimeSeries,
  Line,
  Point,
  Polar,
} from "./types";
import { drawLander, Explosion, Rotate, userLogs, userPlots } from "./render";
import { aboveGround, getAltitude } from "./ground_utils";
import {
  rateLimitedCall,
  sortArrayOfPairs,
  wrapAngle,
  validateUserReturn,
  cartToPolar,
  deg2rad,
  addPoints,
  randomizeVector,
  randomizePoint,
  randomizeNumber,
  makeTimer,
} from "./utils";

import createSCS from "scs-solver"; // if using ES6 modules
import { create, all } from "mathjs";
const mathjs = create(all, {});
const SCS = await createSCS();

export const crashVelocityLimit = 1;
export const crashRotVelLimit = 0.5;
export const crashAngleLimit = 10;
export const fuelCapacity = 10;
export const defaultPhysicsHz = 240;
export const defaultControlHz = 30;

enum LanderRenderState {
  "IDLE",
  "FLYING",
  "EXPLODING",
  "GLOATING", // short wait state for gloating before popup
  "SHOWINFO",
}

const gravity = 1 / 60;
const staticMass = 10;
const rotationalThrustEfficiency = 0.02;
const aftThrustEfficiency = 0.05;

// Rates were all developed based on 60FPS, so we scale to that
const basePhysicsPeriod = 1 / 60;

let log = rateLimitedCall(10, (callNum: number, ...data: any) => {
  userLogs.update((v) => {
    v.push([callNum, data.join("")]);
    return v;
  });
});

let plot = rateLimitedCall(10, (callNum: number, data: {}) => {
  userPlots.update((v) => {
    data["time"] = callNum;
    v.push(data);
    return v;
  });
});

export class LanderPhysics {
  // Configuration
  userAutoPilot: Function;
  enableFuel: boolean; // enforce running out of fuel
  enableFuelMass: boolean; // account for mass of fuel (requires enableFuel)
  allowableAftThrottle: Array<Array<number>>; // array of tuples representing allowable throttle ranges
  allowableRotThrottle: Array<Array<number>>;
  physicsHz: number; // Rate at which physics are simulated
  controlHz: number; // Rate at which controls are simulated
  enablePlotting: boolean = true;
  enableLogging: boolean = true;

  // Internal State
  stateHist: LanderStateTimeSeries; // storage of flight path
  userStore: object; // storage of user data from call to call
  isAboveGround: boolean; // are we still operating?
  crashed: boolean; // does this end in tears?
  error: Error = null; // Store errors encountered while running
  ground: Line; // ground points local storage

  // Rendering State
  renderState: LanderRenderState;
  renderFrameIdx: number;
  explosion: Explosion;
  gloatTimerExpired: () => boolean;

  get ["mass"]() {
    if (this.enableFuelMass) {
      return staticMass + this.stateHist.at(-1).fuelLevel;
    } else {
      return staticMass + fuelCapacity;
    }
  }

  constructor(
    initialState: LanderState,
    userAutoPilot: Function,
    enableFuel: boolean,
    enableFuelMass: boolean,
    allowableAftThrottle: Array<Array<number>>,
    allowableRotThrottle: Array<Array<number>>,
    ground: Line,
    randomize: {
      posFactor: Point;
      linVelFactor: Polar;
      angleFactor: number;
      rotVelFactor: number;
    },
    physicsHz: number = defaultPhysicsHz,
    controlHz: number = defaultControlHz
  ) {
    // Autopilot
    this.userAutoPilot = userAutoPilot;

    // Settings
    this.enableFuel = enableFuel;
    this.enableFuelMass = enableFuelMass;
    this.allowableAftThrottle = sortArrayOfPairs(allowableAftThrottle);
    this.allowableRotThrottle = sortArrayOfPairs(allowableRotThrottle);
    this.physicsHz = physicsHz;
    this.controlHz = controlHz;

    if (physicsHz < controlHz) {
      throw new Error("Physics rate must be higher than control rate");
    }

    const scale = 1 / this.physicsHz / basePhysicsPeriod;

    // Internal State Initial Values
    initialState.fuelLevel = fuelCapacity;
    initialState.angle = wrapAngle(initialState.angle);
    initialState.linVel = initialState.linVel.map((x) => scale * x) as Point;
    initialState.rotVel = scale * initialState.rotVel;
    this.userStore = {};
    this.ground = ground;
    this.isAboveGround = true;
    this.crashed = false;

    // Randomize initial State
    if (randomize) {
      initialState.pos = randomizePoint(
        true,
        initialState.pos,
        randomize.posFactor
      );

      initialState.linVel = randomizeVector(
        true,
        cartToPolar(initialState.linVel),
        randomize.linVelFactor
      );

      initialState.angle = randomizeNumber(
        true,
        initialState.angle,
        randomize.angleFactor
      );
      initialState.rotVel = randomizeNumber(
        true,
        initialState.rotVel,
        randomize.rotVelFactor
      );
    }

    // Render State
    this.renderState = LanderRenderState.IDLE;
    this.renderFrameIdx = 0;
    this.explosion = null;
    this.gloatTimerExpired = null;

    this.stateHist = [Object.assign({}, initialState)];
  }

  getInterpolatedState(
    frameHz: number,
    idx: number
  ): [state: LanderState, isLast: boolean] {
    // Convert the given idx (in frameHz frames) to a physicsHz idx
    // e.g. :
    // frameHz is 60, physicsHz is 120
    // an idx of 5 is actually idx 5*2=10
    let trueIdx = Math.round(idx * (this.physicsHz / frameHz));

    if (trueIdx >= this.stateHist.length) {
      return [this.stateHist.at(-1), true];
    } else {
      return [this.stateHist[trueIdx], false];
    }
  }

  getBbox() {
    let corners: Point[] = [
      [20 / 2, 22 / 2],
      [20 / 2, -22 / 2],
      [-28 / 2, 25 / 2],
      [-28 / 2, -25 / 2],
    ];

    let curState = this.stateHist.at(-1);

    corners = Rotate(corners, curState.angle);
    corners.forEach((_, i, a) => {
      a[i][0] += curState.pos[0];
      a[i][1] += curState.pos[1];
    });

    return corners;
  }

  getDifficulty() {
    // Calculate current energy state of the lander
    // Used to estimate how difficult a scenario is (and influence the score)

    // TODO: Angle seems to weigh too heavily in this
    // Angle 0:17, 45:107, 90:197, 135:287, 180:377, 270: 557

    let initialState = this.stateHist.at(0);

    // height potential
    let eH = this.mass * gravity * getAltitude(this.ground, initialState.pos);

    // angle potential
    let eA = 0.01 * Math.abs(this.mass * initialState.angle);

    // linVel potential
    let [Vmag, _] = cartToPolar(initialState.linVel);
    let eK = 0.5 * this.mass * Math.pow(Vmag, 2);

    // rotVel potential
    let eR = Math.abs(0.5 * this.mass * Math.pow(initialState.rotVel, 2));

    let e = eH + eK + eR + eA;

    return e / fuelCapacity;
  }

  run() {
    let physicsPeriod = 1 / this.physicsHz;
    let controlPeriod = 1 / this.controlHz;
    let controlPeriodRenders = controlPeriod / physicsPeriod;

    let renderCounter = 0;
    let isAboveGround = true;
    while (isAboveGround) {
      let state = Object.assign({}, this.stateHist.at(-1));

      // Run autopilot every nth update
      if (renderCounter % controlPeriodRenders == 0) {
        // take the sum of the last controlPeriodRenders states
        let { linVel, rotVel } = this.stateHist
          .slice(-controlPeriodRenders)
          .reduce(
            (p, s) => ({
              linVel: addPoints(p.linVel, s.linVel),
              rotVel: p.rotVel + s.rotVel,
            }),
            {
              linVel: [0, 0] as Point,
              rotVel: 0,
            }
          );

        let autopilotState: LanderState = {
          linVel: linVel,
          rotVel: rotVel,
          pos: state.pos,
          angle: state.angle,
          aftThrust: state.aftThrust,
          rotThrust: state.rotThrust,
          fuelLevel: state.fuelLevel,
        };

        let start = performance.now();
        autopilotState = this.stepAutopilot(autopilotState);
        let duration = performance.now() - start;

        state.aftThrust = autopilotState.aftThrust;
        state.rotThrust = autopilotState.rotThrust;
        state.fuelLevel = autopilotState.fuelLevel;

        if (duration > (1 / this.controlHz) * 1000) {
          console.warn("Control loop time exceeded");
          // TODO: Do something with this
        }
      }

      renderCounter += 1;

      [state, isAboveGround] = this.stepPhysics(physicsPeriod, state);

      // Store final state
      this.stateHist.push(state);
    }

    // Did we crash or land?
    let finalState = this.stateHist.at(-1);
    let [vel, _] = cartToPolar(finalState.linVel);

    if (
      vel > crashVelocityLimit ||
      finalState.rotVel > crashRotVelLimit ||
      finalState.rotVel < -crashRotVelLimit ||
      finalState.angle > crashAngleLimit ||
      finalState.angle < -crashAngleLimit
    ) {
      this.crashed = true;
    } else {
      this.crashed = false;
    }
  }

  stepAutopilot(state: LanderState): LanderState {
    try {
      let userReturn = this.userAutoPilot({
        x_position: state.pos[0],
        altitude: getAltitude(this.ground, state.pos),
        angle: state.angle,
        userStore: this.userStore,
        log: this.enableLogging ? log : () => {},
        plot: this.enablePlotting ? plot : () => {},
        mathjs: mathjs,
        SCS: SCS,
      });

      let error = validateUserReturn(
        userReturn,
        this.allowableAftThrottle,
        this.allowableRotThrottle
      );

      if (error) {
        this.error = error;
      }

      ({
        rotThrust: state.rotThrust,
        aftThrust: state.aftThrust,
        userStore: this.userStore,
      } = userReturn);
    } catch (error) {
      this.error = error;
      this.userStore = {};
      state.rotThrust = 0;
      state.aftThrust = 0;
    }

    return state;
  }

  stepPhysics(
    physicsPeriod: number,
    state: LanderState
  ): [LanderState, boolean] {
    const scale = physicsPeriod / basePhysicsPeriod;
    const scaleSquare = Math.pow(scale, 2);

    // Update Fuel Levels (track separate from mass since dynamic mass may not be enabled)
    state.fuelLevel -=
      scale *
      (Math.abs(state.rotThrust) * rotationalThrustEfficiency +
        state.aftThrust * aftThrustEfficiency);

    if (state.fuelLevel < 0) {
      state.fuelLevel = 0;
    }

    // Kill thrust if out of fuel
    if (this.enableFuel && state.fuelLevel == 0) {
      state.aftThrust = 0;
      state.rotThrust = 0;
    }

    // Calculate vector components from current angle
    let xCompAccel =
      (state.aftThrust * Math.sin(deg2rad(state.angle))) / this.mass;
    let yCompAccel =
      (state.aftThrust * Math.cos(deg2rad(state.angle))) / this.mass;
    yCompAccel = yCompAccel - gravity;

    let rotAccelComp = state.rotThrust / this.mass; // mass isn't really accurate here as it should be rotational inertia

    // Update accel
    let linAccel: Point = [scaleSquare * xCompAccel, scaleSquare * yCompAccel];
    let rotAccel: number = scaleSquare * rotAccelComp;

    // Update speed
    state.linVel = addPoints(state.linVel, linAccel);
    state.rotVel = state.rotVel + rotAccel;

    // Update position
    state.pos = addPoints(state.pos, state.linVel);
    state.angle = state.angle + state.rotVel;

    // Wrap angle to keep it -180 - +180
    state.angle = wrapAngle(state.angle);

    // Find position of each corner of the lander bounding box
    this.isAboveGround = this.getBbox().reduce(
      (allAbove: boolean, corner: Point) => {
        return allAbove && aboveGround(this.ground, corner);
      },
      true
    );

    return [state, this.isAboveGround];
  }

  render(
    context: CanvasRenderingContext2D,
    launch: boolean,
    thrustImage: HTMLImageElement,
    landerImage: HTMLImageElement,
    fuelCallback: (fuel: number) => void
  ): boolean {
    switch (this.renderState) {
      case LanderRenderState.IDLE: {
        let [state, _] = this.getInterpolatedState(60, 0);
        fuelCallback(state.fuelLevel);
        drawLander(context, state, thrustImage, landerImage);

        if (launch) {
          this.renderState = LanderRenderState.FLYING;
        }
        break;
      }

      case LanderRenderState.FLYING: {
        let [state, isLast] = this.getInterpolatedState(
          60,
          this.renderFrameIdx
        );
        fuelCallback(state.fuelLevel);
        drawLander(context, state, thrustImage, landerImage);
        this.renderFrameIdx += 1;

        if (isLast) {
          if (this.crashed) {
            this.explosion = new Explosion(
              3000,
              state.pos,
              state.linVel,
              state.fuelLevel + 2,
              this.ground
            );
            this.renderState = LanderRenderState.EXPLODING;
          } else {
            this.gloatTimerExpired = makeTimer(1000);
            this.renderState = LanderRenderState.GLOATING;
          }
        }
        break;
      }

      case LanderRenderState.EXPLODING: {
        let state = this.stateHist.at(-1);
        fuelCallback(state.fuelLevel);
        let explosionDone = this.explosion.render(context);
        if (explosionDone) {
          this.renderState = LanderRenderState.SHOWINFO;
        }
        break;
      }

      case LanderRenderState.GLOATING: {
        let state = this.stateHist.at(-1);
        fuelCallback(state.fuelLevel);
        state.aftThrust = 0;
        state.rotThrust = 0;
        drawLander(context, state, thrustImage, landerImage);
        if (this.gloatTimerExpired()) {
          this.gloatTimerExpired = null;
          this.renderState = LanderRenderState.SHOWINFO;
        }
        break;
      }

      case LanderRenderState.SHOWINFO: {
        let state = this.stateHist.at(-1);
        fuelCallback(state.fuelLevel);
        if (!this.crashed) {
          state.aftThrust = 0;
          state.rotThrust = 0;
          drawLander(context, state, thrustImage, landerImage);
        }
        return true;
      }

      default:
        break;
    }

    return false;
  }
}
