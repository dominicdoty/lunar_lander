// Arguments:
let {
    x_position,
    altitude,
    angle,
    userStore,
    log,
    plot
} = arguments[0];

// Example of how to initialize user storage
if (!("store" in userStore)) {
    userStore.store = 0;
}

// Example of how to log to the user accessible console
log("x_pos: ", x_position.toFixed(1));

// Example of how to plot to the plots tab
plot({
    altitude: altitude
});

// Return:
return {
    rotThrust: 0,
    aftThrust: 0,
    userStore: userStore,
};