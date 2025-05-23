import { cartToPolar, type Line, type Point } from "./render";
import { Rotate, deg2rad, userLogs, userPlots } from "./render";
import { gground, launchError } from "./game";
import { aboveGround, findGroundPoint } from "./ground_utils";
import {
  rateLimitedCall,
  sortArrayOfPairs,
  wrapAngle,
  validateUserReturn,
} from "./utils";

export const crashVelocityLimit = 1;
export const crashRotVelLimit = 0.5;
export const crashAngleLimit = 10;

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
  // Set Values
  pos: Point; // pixels
  linVel: Point; // XY vector pix/sec
  angle: number; // degrees
  rotVel: number; // deg/sec
  userAutoPilot: Function;
  enableFuel: boolean; // enforce running out of fuel
  enableFuelMass: boolean; // account for mass of fuel (requires enableFuel)
  allowableAftThrottle: Array<Array<number>>; // array of tuples representing allowable throttle ranges
  allowableRotThrottle: Array<Array<number>>;

  // Static Values
  gravity: number;
  staticMass: number;
  rotationalThrustEfficiency: number; // thrust is mulitplied by this number and subtracted from fuel level
  rotThrustEffectivity: number; // factor to convert thrust to force
  aftThrustEfficiency: number; // thrust is mulitplied by this number and subtracted from fuel level
  aftThrustEffectivity: number; // factor to convert thrust to force

  // Internal State Initial Values
  linAccel: Point; // XY vector pix/sec^2
  rotAccel: number; // deg/sec^2
  initialFuelLevel: number;
  fuelLevel: number;
  aftThrust: number; // last user autopilot numbers
  rotThrust: number; // last user autopilot numbers
  userStore: object; // storage of user data from call to call
  isAboveGround: boolean; // are we still operating?
  ground: Line; // ground points local storage

  get ["mass"]() {
    if (this.enableFuelMass) {
      return this.staticMass + this.fuelLevel;
    } else {
      return this.staticMass + this.initialFuelLevel;
    }
  }

  constructor(
    starting_pos: Point,
    linVel: Point,
    angle: number,
    rotVel: number,
    userAutoPilot: Function,
    enableFuel: boolean,
    enableFuelMass: boolean,
    allowableAftThrottle: Array<Array<number>>,
    allowableRotThrottle: Array<Array<number>>
  ) {
    // Set Values
    this.pos = starting_pos;
    this.linVel = linVel;
    this.angle = wrapAngle(angle);
    this.rotVel = rotVel;
    this.userAutoPilot = userAutoPilot;
    this.enableFuel = enableFuel;
    this.enableFuelMass = enableFuelMass;
    this.allowableAftThrottle = sortArrayOfPairs(allowableAftThrottle);
    this.allowableRotThrottle = sortArrayOfPairs(allowableRotThrottle);

    // Static Values
    this.gravity = 1 / 60;
    this.staticMass = 10;
    this.rotationalThrustEfficiency = 0.02;
    this.rotThrustEffectivity = 1;
    this.aftThrustEfficiency = 0.05;
    this.aftThrustEffectivity = 1;

    // Internal State Initial Values
    this.linAccel = [0, 0];
    this.rotAccel = 0;
    this.initialFuelLevel = 10;
    this.fuelLevel = 10;
    this.aftThrust = 0;
    this.rotThrust = 0;
    this.userStore = {};
    this.isAboveGround = true;
    gground.subscribe((v) => {
      this.ground = v;
    });
  }

  getAltitude(): number {
    let [gp, _] = findGroundPoint(this.ground, this.pos);
    return this.pos[1] - gp[1];
  }

  getBbox() {
    let corners: Point[] = [
      [20 / 2, 22 / 2],
      [20 / 2, -22 / 2],
      [-28 / 2, 25 / 2],
      [-28 / 2, -25 / 2],
    ];

    corners = Rotate(corners, this.angle);
    corners.forEach((_, i, a) => {
      a[i][0] += this.pos[0];
      a[i][1] += this.pos[1];
    });

    return corners;
  }

  getDifficulty() {
    // Calculate current energy state of the lander
    // Used to estimate how difficult a scenario is (and influence the score)

    // TODO: Angle seems to weigh too heavily in this
    // Angle 0:17, 45:107, 90:197, 135:287, 180:377, 270: 557

    // height potential
    let eH = this.mass * this.gravity * this.getAltitude();

    // angle potential
    let eA = 0.01 * Math.abs(this.mass * this.angle);

    // linVel potential
    let [Vmag, _] = cartToPolar(this.linVel);
    let eK = 0.5 * this.mass * Math.pow(Vmag, 2);

    // rotVel potential
    let eR = Math.abs(0.5 * this.mass * Math.pow(this.rotVel, 2));

    let e =
      (eH + eK) / this.aftThrustEffectivity +
      (eR + eA) / this.rotThrustEffectivity;

    return e / this.fuelLevel;
  }

  update() {
    // Run User Autopilot Command
    try {
      let userReturn = this.userAutoPilot({
        x_position: this.pos[0],
        altitude: this.getAltitude(),
        angle: this.angle,
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
        rotThrust: this.rotThrust,
        aftThrust: this.aftThrust,
        userStore: this.userStore,
      } = userReturn);
    } catch (error) {
      launchError.set(error);
      this.rotThrust = 0;
      this.aftThrust = 0;
      this.userStore = {};
    }

    // Update Fuel Levels (track separate from mass since dynamic mass may not be enabled)
    this.fuelLevel -=
      Math.abs(this.rotThrust) * this.rotationalThrustEfficiency +
      this.aftThrust * this.aftThrustEfficiency;
    if (this.fuelLevel <= 0) {
      this.fuelLevel = 0;
    }

    // Kill thrust if out of fuel
    if (this.enableFuel && this.fuelLevel == 0) {
      this.aftThrust = 0;
      this.rotThrust = 0;
    }

    // Calculate vector components from current angle
    let xCompAccel =
      (this.aftThrust *
        this.aftThrustEffectivity *
        Math.sin(deg2rad(this.angle))) /
      this.mass;
    let yCompAccel =
      (this.aftThrust *
        this.aftThrustEffectivity *
        Math.cos(deg2rad(this.angle))) /
      this.mass;

    // Update accel
    this.linAccel = [xCompAccel, yCompAccel - this.gravity];
    this.rotAccel = (this.rotThrust * this.rotThrustEffectivity) / this.mass; // mass isn't really accurate here as it should be rotational inertia

    // Update speed
    this.linVel = [
      this.linVel[0] + this.linAccel[0],
      this.linVel[1] + this.linAccel[1],
    ];
    this.rotVel = this.rotVel + this.rotAccel;

    // Update position
    this.pos = [this.pos[0] + this.linVel[0], this.pos[1] + this.linVel[1]];
    this.angle = this.angle + this.rotVel;

    // Wrap angle to keep it -180 - +180
    this.angle = wrapAngle(this.angle);

    // Find position of each corner of the lander bounding box
    for (let corner of this.getBbox()) {
      // Check for below ground
      this.isAboveGround = aboveGround(this.ground, corner);

      if (!this.isAboveGround) {
        break;
      }
    }
  }

  getLanderSuccessState() {
    if (this.isAboveGround) {
      return "flying";
    } else {
      let [vel, _] = cartToPolar(this.linVel);

      if (
        vel > crashVelocityLimit ||
        this.rotVel > crashRotVelLimit ||
        this.rotVel < -crashRotVelLimit ||
        this.angle > crashAngleLimit ||
        this.angle < -crashAngleLimit
      ) {
        return "crashed";
      } else {
        return "landed";
      }
    }
  }
}
