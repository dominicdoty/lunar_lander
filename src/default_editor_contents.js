/*
 * Notes on simulation parameters:
 * Generally simulation parameters are not selected for realism
 * but instead to try to make the game fun.
 *
 * Angular units are presented in degrees, while linear units are pixels.
 *
 * If "Fuel Mass" is enabled in the Options tab, fuel mass will
 * affect acceleration of the spacecraft. If not, the initial fuel
 * mass is used for the entire landing.
 *
 * Spacecraft Mass:
 *   initial fuel_mass = 10
 *   mass = 10 + fuel_mass
 *   fuel consumption = (|rotThrust| * 0.02) + (|aftThrust| * 0.05)
 *   you must track fuel consumed
 *
 * Acceleration:
 *   gravity = 1 / 60
 *   linear = aftThrust / mass  (in direction of current lander angle)
 *   angular = rotThrust / mass (used as an approximation of MOI)
 *
 * Successful landing parameters:
 *   |angle|       < 10  [degrees] from vertical
 *   |linear  vel| < 1   [units/second]
 *   |angular vel| < 0.5 [degrees/second]
 */

// Arguments:
let {
  x_position,
  altitude,
  angle,
  userStore,
  log,
  plot,
  mathjs,
  SCS
} = arguments[0];

// Example of how to initialize user storage
if (!("store" in userStore)) {
  userStore.store = 0;
}

// Example of how to log to the user accessible console
log("x_pos: ", x_position.toFixed(1));

// Example of how to plot to the plots tab
plot({
  altitude: altitude,
});

// Return:
return {
  rotThrust: 0,
  aftThrust: 0,
  userStore: userStore,
};