import type { Point } from "./types";

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
) {
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
    throw aftErr;
  }
  if (rotErr != null) {
    throw rotErr;
  }
}

export function runNoConsole(f: (a0: any) => any, args: { any: any }) {
  let methods = { log: {}, debug: {}, warn: {}, info: {} };

  try {
    // Temporarily suppress the console methods
    // This allows us to test the user code before the launch
    Object.keys(methods).forEach((method) => {
      methods[method] = window.console[method];
      window.console[method] = function () {};
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

export function polarToCart(mag: number, angle: number): Point {
  return [mag * Math.sin(deg2rad(angle)), mag * Math.cos(deg2rad(angle))];
}

export function cartToPolar(cart: Point): [mag: number, ang: number] {
  let [x, y] = cart;
  let mag = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
  let angle = -1 * (rad2deg(Math.atan2(y, x)) - 90);
  return [mag, angle];
}

export function randomizeVector(
  startMag: string | number,
  startAngle: string | number,
  randomize: boolean,
  factorMag: string | number,
  factorAngle: string | number
): Point {
  let mag = randomizeNumber(startMag, randomize, factorMag, 0);
  let angle = randomizeNumber(startAngle, randomize, factorAngle, 0);
  return polarToCart(mag, angle);
}

export function randomizeNumber(
  startingValue: string | number,
  randomize: boolean,
  randomizeFactor: string | number,
  def: number
) {
  if (randomize) {
    return (
      makeSafe(startingValue, def) +
      (Math.random() * 2 - 1) * makeSafe(randomizeFactor, 0)
    );
  } else {
    return makeSafe(startingValue, def);
  }
}

export function deg2rad(angle: number) {
  return (Math.PI / 180) * angle;
}

export function rad2deg(angle: number) {
  return (180 / Math.PI) * angle;
}

export function makeSafe(n: string | number, def: number) {
  if (typeof n == "number") {
    return n;
  } else {
    let safeN = parseFloat(n);
    if (!isFinite(safeN)) {
      safeN = def;
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
