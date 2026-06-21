import { defineConfig } from "tsup";

// JS/d.ts only; CSS ships as static files under styles/ (see package exports).
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["react", "react-dom", "react/jsx-runtime"],
});
