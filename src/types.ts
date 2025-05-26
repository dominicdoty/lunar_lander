/** [X,Y] */
export type Point = [x: number, y: number];
export type Line = Point[];
export type Polar = [mag: number, angle: number];

export type AutopilotArgs = {
  x_position: number;
  altitude: number;
  angle: number;
  userStore: {};
  log: (...args: any) => void;
  plot: (...args: any) => void;
  mathjs: any;
  SCS: any;
};

export type LanderState = {
  pos: Point;
  linVel: Point;
  angle: number;
  rotVel: number;
  aftThrust: number;
  rotThrust: number;
  fuelLevel: number;
};

export type LanderStateTimeSeries = LanderState[];
