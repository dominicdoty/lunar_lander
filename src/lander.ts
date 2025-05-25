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

export const crashVelocityLimit = 1;
export const crashRotVelLimit = 0.5;
export const crashAngleLimit = 10;
export const fuelCapacity = 10;

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
  stateHist: LanderStateTimeSeries;
  userAutoPilot: Function;
  enableFuel: boolean; // enforce running out of fuel
  enableFuelMass: boolean; // account for mass of fuel (requires enableFuel)
  allowableAftThrottle: Array<Array<number>>; // array of tuples representing allowable throttle ranges
  allowableRotThrottle: Array<Array<number>>;

  // Internal State Initial Values
  userStore: object; // storage of user data from call to call
  isAboveGround: boolean; // are we still operating?
  crashed: boolean; // does this end in tears?
  error: Error; // Store errors encountered while running
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
    randomize?: {
      posFactor: Point;
      linVelFactor: Polar;
      angleFactor: number;
      rotVelFactor: number;
    }
  ) {
    // Autopilot
    this.userAutoPilot = userAutoPilot;

    // Settings
    this.enableFuel = enableFuel;
    this.enableFuelMass = enableFuelMass;
    this.allowableAftThrottle = sortArrayOfPairs(allowableAftThrottle);
    this.allowableRotThrottle = sortArrayOfPairs(allowableRotThrottle);

    // Internal State Initial Values
    initialState.fuelLevel = fuelCapacity;
    initialState.angle = wrapAngle(initialState.angle);
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

  getInterpolatedState(frameRate: number, idx: number): LanderState {
    // TODO: Interpolate here between the physics rate and frame rate
    return this.stateHist[idx];
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

  run(PhysicsHz: number, controlHz: number) {
    if (PhysicsHz < controlHz) {
      throw new Error("Physics rate must be higher than control rate");
    }

    let physicsPeriod = 1 / PhysicsHz;
    let controlPeriod = 1 / controlHz;
    let controlPeriodRenders = physicsPeriod / controlPeriod;

    let renderCounter = 0;
    let isAboveGround = true;
    while (isAboveGround) {
      let state = Object.assign({}, this.stateHist.at(-1));

      // Run autopilot every nth update
      if (renderCounter % controlPeriodRenders == 0) {
        let start = performance.now();
        state = this.stepAutopilot(state);
        let duration = performance.now() - start;

        if (duration > (1 / controlHz) * 1000) {
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
        log: log,
        plot: plot,
      });

      validateUserReturn(
        userReturn,
        this.allowableAftThrottle,
        this.allowableRotThrottle
      );

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

    // Update Fuel Levels (track separate from mass since dynamic mass may not be enabled)
    state.fuelLevel -=
      scale *
      (Math.abs(state.rotThrust) * rotationalThrustEfficiency +
        state.aftThrust * aftThrustEfficiency);

    if (state.fuelLevel <= 0) {
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

    // Update accel
    let linAccel: Point = [scale * xCompAccel, scale * (yCompAccel - gravity)];
    let rotAccel: number = scale * (state.rotThrust / this.mass); // mass isn't really accurate here as it should be rotational inertia

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
        let state = this.getInterpolatedState(60, 0);
        drawLander(context, state, thrustImage, landerImage);

        if (launch) {
          this.renderState = LanderRenderState.FLYING;
        }
        break;
      }

      case LanderRenderState.FLYING: {
        let state = this.getInterpolatedState(60, this.renderFrameIdx);
        drawLander(context, state, thrustImage, landerImage);
        fuelCallback(state.fuelLevel);

        this.renderFrameIdx += 1;
        if (this.renderFrameIdx == this.stateHist.length) {
          if (this.crashed) {
            this.explosion = new Explosion(
              3000,
              state.pos,
              state.linVel,
              state.fuelLevel,
              this.ground
            );
            this.renderState = LanderRenderState.EXPLODING;
          } else {
            this.gloatTimerExpired = makeTimer(3000);
            this.renderState = LanderRenderState.GLOATING;
          }
        }
        break;
      }

      case LanderRenderState.EXPLODING: {
        let explosionDone = this.explosion.render(context);
        if (explosionDone) {
          this.renderState = LanderRenderState.SHOWINFO;
        }
        break;
      }

      case LanderRenderState.GLOATING: {
        let state = this.stateHist.at(-1);
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
        return true;
      }

      default:
        break;
    }

    return false;
  }
}
