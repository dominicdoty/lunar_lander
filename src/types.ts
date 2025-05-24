/** [X,Y] */
export type Point = [number, number];
export type Line = Point[];

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
