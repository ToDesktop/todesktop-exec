- [ToDesktop Exec](#todesktop-exec)
  - [Installation](#installation)
  - [Security](#security)
  - [Usage](#usage)
  - [Architecture](#architecture)
  - [Development](#development)

# ToDesktop Exec

This package adds desktop app functionality for bundling and executing exec files.

## Installation

Install `@todesktop/client-exec` in your client-side application using

```sh
$ npm install @todesktop/client-exec
```

Installation of the [plugin](https://www.npmjs.com/package/@todesktop/plugin-exec) package is also necessary. This can be done via the ToDesktop Builder interface.

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
