import { defineConfig } from "tsup";

// esbuild emits Node-correct ESM (proper relative specifiers), so the source
// can stay extensionless and consumers (incl. plain ESM Node) load cleanly.
// Two entries: "." = framework-agnostic core, "./widget" = React component.
export default defineConfig({
  entry: { index: "src/index.ts", widget: "src/widget.tsx" },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["react", "react-dom", "react/jsx-runtime"],
});
