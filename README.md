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

Calling `execute` will execute the file. Make sure to call `subscribe` before execution if you would like to see the execution logs.

```js
import { execute } from "@todesktop/client-exec";

await execute();
```
