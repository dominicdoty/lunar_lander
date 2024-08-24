// Arguments:
let {
    x_position,
    altitude,
    angle,
    userStore
} = arguments[0];

// Example of how to initialize user storage
if (!("store" in userStore)) {
    userStore.store = 0;
}

// Return:
return {
    rotThrust: 0,
    aftThrust: 0,
    userStore: userStore
};