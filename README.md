# ToDesktop Exec

Bundle and execute exec files.

## Installation

Install `@todesktop/client-exec` in your client-side application using

```sh
npm install @todesktop/client-exec
```

Installation of the [plugin](https://www.npmjs.com/package/@todesktop/plugin-exec) package is also necessary. Using the ToDesktop Builder interface, navigate to **Plugins.** Click on the **Explore** button for "File Exec" and install the package.

## Usage

### subscribe

Listen to `debug`, `stdout`, or `stderr` logs from your executable.

```js
import { subscribe } from "@todesktop/client-exec";

subscribe((message) => {
  if (message.type === "debug") {
    // todesktop process log
  } else if (message.type === "stdout") {
    // stdout from executable
  } else if (message.type === "stderr") {
    // stderr from exectuable
  }
});
```

### execute

Calling `execute` will execute the file. Make sure to call `subscribe` before execution if you would like to see the execution logs. You can pass command-line arguments to your executable using an array of flags.

```js
import { execute } from "@todesktop/client-exec";

// Execute without flags
await execute();

// Execute with flags
await execute(["--version"]);

// Execute with multiple flags
await execute(["--config", "path/to/config.json", "--verbose"]);
```

### terminateAllProcesses

Manually terminate all processes that were spawned by `execute`. This function waits for processes to actually terminate before returning and provides detailed results about the termination operation.

The function:

- First attempts graceful termination with SIGTERM
- Waits up to 5 seconds for processes to exit gracefully
- Forces termination with SIGKILL if processes don't respond
- Returns only after all termination attempts are complete (max ~7 seconds)
- Returns a result object with termination statistics

NOTE: This will not terminate processes that were spawned by other instances of your application which may not have quit correctly

```js
import { terminateAllProcesses } from "@todesktop/client-exec";

// Terminate all active processes
const result = await terminateAllProcesses();

// Result object structure:
// {
//   terminated: 3,    // Number of successfully terminated processes
//   failed: 1,        // Number of processes that couldn't be terminated
//   errors: [         // Array of error messages for failed terminations
//     "Process 2: Failed to send SIGTERM signal"
//   ]
// }

if (result.failed > 0) {
  console.error("Some processes could not be terminated:", result.errors);
}
```

## Platform Notes

### macOS

- `.pkg` files are automatically opened using the `open` command, rather than being executed directly. This allows for the standard macOS package installation process.

## Process Management

- All spawned processes are automatically tracked and properly terminated when the parent application quits
- During app shutdown, processes are given 2 seconds to terminate gracefully before being force-killed
- The `terminateAllProcesses()` function can be used to manually terminate all running processes
- Both automatic and manual termination verify that processes actually exit before proceeding
- This prevents orphaned processes from running after the ToDesktop app is closed

## Changelog

### 0.19.0

- Added `terminateAllProcesses()` function to manually terminate all spawned processes
- Function waits for process termination with timeout handling
- Returns detailed results including success/failure counts and error messages
- Attempts graceful termination (SIGTERM) before forcing with SIGKILL
- Improved `before-quit` handler to properly wait for process termination during app shutdown
- Extracted shared termination logic for consistent behavior between manual and automatic cleanup
- Added tests for process termination and execution functionality

### 0.18.0

- Added automatic process cleanup when the parent application quits to prevent orphaned processes

### 0.17.0

- `.pkg` files are automatically opened using the `open` command, rather than being executed directly

### 0.16.0

- Added support for command-line arguments/flags in the `execute` function
- Added debug logging for flag usage

### 0.15.1

- Fixed an issue where the executable would not spawn on Windows (https://github.com/nodejs/node/issues/52554)
