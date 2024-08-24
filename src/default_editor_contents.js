// Arguments:
let {
    x_position,
    altitude,
    angle,
    userStore,
    log
} = arguments[0];

// Example of how to initialize user storage
if (!("store" in userStore)) {
    userStore.store = 0;
}

// Example of how to log to the user accessible console
log("x_pos: ", x_position.toFixed(1));

// Return:
return {
    rotThrust: 0,
    aftThrust: 0,
    userStore: userStore,
};