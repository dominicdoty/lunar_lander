import { findGroundPoint } from "./ground_utils";
import { Options } from "./settings";
import type { CoordinateSpace } from "./render";
import type { AutopilotArgs, Line, Point, Polar } from "./types";

export function getNearerOfTwo(
  value: number,
  low: number,
  high: number
): number {
  if (value - low < (high - low) / 2) {
    value = low;
  } else {
    value = high;
  }

  return value;
}

export function snapToLimits(
  value: number,
  name: string,
  limits: Array<Array<number>>
): [number, Error] {
  let lastExceeded = 0;

  for (let i = 0; i < limits.length; i++) {
    const [low, high] = limits[i];

    // Fastpath checks
    if (value >= low && value <= high) {
      return [value, null];
    }

    // Too big for this set, keep looking
    if (value > high) {
      lastExceeded = high;
      continue;
    }

    // Too small for this set
    if (value < low) {
      // Find the closer of the last limit we exceeded and the current lower bound
      value = getNearerOfTwo(value, lastExceeded, low);
      return [value, new Error(`${name} clipped to ${value.toFixed(2)}`)];
    }
  }

  // Catch when we fall off the end without finding a limit
  value = lastExceeded;
  return [value, new Error(`${name} clipped to ${value.toFixed(2)}`)];
}

export function sortArrayOfPairs(
  arr: Array<Array<number>>
): Array<Array<number>> {
  // Sort pairs first
  let pairSortedArr = arr.map((pair) => {
    let [a, b] = pair;
    if (a > b) {
      return [b, a];
    } else {
      return [a, b];
    }
  });

  // Sort outer second
  pairSortedArr.sort((a, b) => {
    if (a[0] > b[0]) {
      return 1;
    } else {
      return -1;
    }
  });

  return pairSortedArr;
}

export function wrapAngle(angle: number): number {
  angle = (angle + 180) % 360;
  if (angle < 0) {
    angle += 360;
  }
  angle -= 180;
  return angle;
}

export function rateLimitedCall(
  acceptInterval: number,
  call: (callNum: number, ...args: any) => void
) {
  let callNum = 0;
  return (...args: any) => {
    if (callNum % acceptInterval == 0) {
      call(callNum, ...args);
    }
    callNum++;
  };
}

export function validateUserReturn(
  obj: Object,
  aftLimits: number[][],
  rotLimits: number[][]
): Error {
  let checkMissing = (key: string, obj: Object) => {
    if (!(key in obj)) {
      throw new Error(`${key} missing from return object!`);
    }
  };

  let checkNumber = (key: string, obj: Object) => {
    if (typeof obj[key] != "number") {
      throw new Error(`${key} is not a number!`);
    }
  };

  let checkFinite = (key: string, obj: Object) => {
    if (!isFinite(obj[key])) {
      throw new Error(`${key} is not a number!`);
    }
  };

  // Hard checks (throw an error and stop)
  checkMissing("rotThrust", obj);
  checkMissing("aftThrust", obj);
  checkMissing("userStore", obj);

  checkNumber("rotThrust", obj);
  checkNumber("aftThrust", obj);

  checkFinite("rotThrust", obj);
  checkFinite("aftThrust", obj);

  // Soft checks (report an error but modify values)
  let aftErr = null;
  let rotErr = null;

  [obj["aftThrust"], aftErr] = snapToLimits(
    obj["aftThrust"],
    "aftThrust",
    aftLimits
  );
  [obj["rotThrust"], rotErr] = snapToLimits(
    obj["rotThrust"],
    "rotThrust",
    rotLimits
  );

  if (aftErr != null) {
    return aftErr;
  } else if (rotErr != null) {
    return rotErr;
  }

  return null;
}

export function runNoConsole(f: Function, args: AutopilotArgs) {
  let methods = { log: {}, debug: {}, warn: {}, info: {} };

  try {
    // Temporarily suppress the console methods
    // This allows us to test the user code before the launch
    Object.keys(methods).forEach((method) => {
      methods[method] = window.console[method];
      window.console[method] = (...args) => null;
    });

    return f(args);
  } catch (error) {
    throw error;
  } finally {
    // Restore console methods
    Object.keys(methods).forEach((method) => {
      window.console[method] = methods[method];
    });
  }
}

export function polarToCart([mag, angle]: Polar): Point {
  return [mag * Math.sin(deg2rad(angle)), mag * Math.cos(deg2rad(angle))];
}

export function cartToPolar([x, y]: Point): Polar {
  let mag = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
  let angle = -1 * (rad2deg(Math.atan2(y, x)) - 90);
  return [mag, angle];
}

export function randomizePoint(
  randomize: boolean,
  initial: Point,
  randomFactor: Point
): Point {
  return [
    randomizeNumber(randomize, initial[0], randomFactor[0]),
    randomizeNumber(randomize, initial[1], randomFactor[1]),
  ];
}

export function randomizeVector(
  randomize: boolean,
  initial: Polar,
  randomFactor: Polar
): Point {
  return polarToCart([
    randomizeNumber(randomize, initial[0], randomFactor[0]),
    randomizeNumber(randomize, initial[1], randomFactor[1]),
  ]);
}

export function randomizeNumber(
  randomize: boolean,
  startingValue: number,
  randomizeFactor: number
) {
  if (randomize) {
    return startingValue + (Math.random() * 2 - 1) * randomizeFactor;
  } else {
    return startingValue;
  }
}

export function deg2rad(angle: number) {
  return (Math.PI / 180) * angle;
}

export function rad2deg(angle: number) {
  return (180 / Math.PI) * angle;
}

export function makeNumber(n: string | number, defaultValue: number) {
  if (typeof n == "number") {
    return n;
  } else {
    let safeN = parseFloat(n);
    if (!isFinite(safeN)) {
      safeN = defaultValue;
    }
    return safeN;
  }
}

export function addPoints(...points: Point[]): Point {
  return points.reduce(
    (prev: Point, cur: Point) => [prev[0] + cur[0], prev[1] + cur[1]],
    [0, 0]
  );
}

export function subtractPoints(...points: Point[]): Point {
  return points
    .slice(1)
    .reduce(
      (prev: Point, cur: Point) => [prev[0] - cur[0], prev[1] - cur[1]],
      points[0]
    );
}

export function makeTimer(timeout: number) {
  let endTime = performance.now() + timeout;
  return () => performance.now() > endTime;
}

export function initialFromOptions(
  options: Options,
  ground: Line,
  fuelCapacity: number,
  vw: CoordinateSpace
) {
  let initial = {
    pos: [0, 0] as Point,
    linVel: [0, 0] as Point,
    angle: 0,
    rotVel: 0,
    aftThrust: 0,
    rotThrust: 0,
    fuelLevel: 0,
  };

  let groundHeight = findGroundPoint(ground, [options.startingX, 0])[0][1];
  let availHeight = vw.height - groundHeight;

  initial.pos = [
    (options.startingX / 100) * vw.width,
    (options.startingAltitude / 100) * availHeight + groundHeight,
  ];

  initial.linVel = polarToCart([
    options.velocityVectorMagnitude,
    options.velocityVectorAngle,
  ]);

  initial.angle = options.startingAngle;
  initial.rotVel = options.rotationalVelocity;
  initial.aftThrust = 0;
  initial.rotThrust = 0;
  initial.fuelLevel = fuelCapacity;

  return initial;
}

export function randomizeInitialFromOptions(options: Options): {
  posFactor: Point;
  linVelFactor: Polar;
  angleFactor: number;
  rotVelFactor: number;
} {
  let factors = {
    posFactor: [0, 0] as Point,
    linVelFactor: [0, 0] as Polar,
    angleFactor: 0,
    rotVelFactor: 0,
  };

  if (options.velocityVectorRandomize) {
    factors.linVelFactor = [
      options.velocityVectorMagnitude,
      options.velocityVectorAngle,
    ] as Polar;
  }
  if (options.startingAngleRandomize) {
    factors.angleFactor = options.startingAngleRandomizeAngle;
  }
  if (options.rotationalVelocityRandomize) {
    factors.rotVelFactor = options.rotationalVelocityRandomizeMagnitude;
  }

  return factors;
}

export function average(nums: number[]): number {
  return nums.reduce((p, c) => p + c) / nums.length;
}
