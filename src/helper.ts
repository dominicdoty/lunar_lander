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
