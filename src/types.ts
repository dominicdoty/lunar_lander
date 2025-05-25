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
};

export type LanderStateTimeSeries = {
  pos: Point[];
  angle: number[];
  linVel: Point[];
  rotVel: number[];
  aftThrust: number[];
  rotThrust: number[];
  fuelLevel: number[];
};
