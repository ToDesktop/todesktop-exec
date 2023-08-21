import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

const config = [
  //  plugin/src/main.ts => plugin/dist/main.js
  {
    input: "packages/plugin/src/main.ts",
    output: {
      format: "cjs",
      name: "index",
      file: "packages/plugin/dist/main.js",
    },
    plugins: [typescript({ outDir: "packages/plugin/dist" }), commonjs()],
  },
  //  plugin/src/preload.ts => plugin/dist/preload.js
  {
    input: "packages/plugin/src/preload.ts",
    output: {
      format: "cjs",
      name: "index",
      file: "packages/plugin/dist/preload.js",
      inlineDynamicImports: true,
    },
    plugins: [
      typescript({ outDir: "packages/plugin/dist" }),
      nodeResolve({ browser: true }),
      commonjs({}),
    ],
    external: ["electron"],
  },
  //  client/src/index.ts => client/dist/index.js
  {
    input: "packages/client/src/index.ts",
    output: {
      format: "cjs",
      name: "index",
      file: "packages/client/dist/index.js",
    },
    plugins: [typescript({ outDir: "packages/client/dist" }), commonjs()],
  },
];

export default config;
