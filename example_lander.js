// Arguments:
let { x_position, altitude, angle, userStore } = arguments[0];

let [rp, ri, rd] = [0.03, 0.0, 0.6];
let [p, i, d] = [0.5, 0.01, 0.001];
let touchDownVel = 0.7;
let velocitySlope = 1 / 300;
let maxV = 1.8;

if (!("integral" in userStore)) {
  userStore.integral = 0;
  userStore.rIntegral = 0;
  userStore.lastErr = 0;
  userStore.rLastErr = 0;

  userStore.lastX = x_position;
  userStore.lastAltitude = altitude;
  userStore.lastAngle = angle;

  // Escape return here since we can't do anything on the first frame
  return { rotThrust: 0, aftThrust: 0, userStore: userStore };
}

// Calculate Acceleration & Velocity for Linear and Rotation
let motionVector = [
  x_position - userStore.lastX,
  altitude - userStore.lastAltitude,
];

// Reduce velocity linearly as you approach the ground
let targetVelocity = velocitySlope * altitude + touchDownVel;
targetVelocity = targetVelocity > maxV ? maxV : targetVelocity;

// Velocity Control
let error = -1 * motionVector[1] - targetVelocity;
userStore.integral += error;
let aftThrust =
  p * error + i * userStore.integral + d * (error - userStore.lastErr);

// Stop rotation + orient against the motion vector
let targetAngle =
  (180 / Math.PI) * Math.atan2(-1 * motionVector[1], 1 * motionVector[0]) - 90;
targetAngle = targetAngle > 90 ? 90 : targetAngle;
targetAngle = targetAngle < -90 ? -90 : targetAngle;

// Rotation Control
let rerror = targetAngle - angle;
userStore.rIntegral += rerror;
let rotThrust =
  rp * rerror + ri * userStore.rIntegral + rd * (rerror - userStore.rLastErr);

// Store
userStore.lastErr = error;
userStore.rLastErr = rerror;
userStore.lastX = x_position;
userStore.lastAltitude = altitude;
userStore.lastAngle = angle;

// Clip
aftThrust = aftThrust < 0 ? 0 : aftThrust;
aftThrust = aftThrust > 1 ? 1 : aftThrust;
rotThrust = rotThrust > 1 ? 1 : rotThrust;
rotThrust = rotThrust < -1 ? -1 : rotThrust;

// Return:
return { rotThrust: rotThrust, aftThrust: aftThrust, userStore: userStore };
