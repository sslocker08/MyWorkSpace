// @mwstudio/feedback — public entry point.
// Wave 0 ships the shared types/interfaces; the React widget + backend client
// land in Wave 0 implementation (see ../README.md and ../../docs/HUMAN-VS-AI.md).
//
// Type-only re-export: `types.ts` holds no runtime values, so `export type *`
// is elided at emit. This avoids an extensionless runtime import in
// dist/index.js that ESM Node (`type: module`) cannot resolve (ERR_MODULE_NOT_FOUND).
// When runtime modules (widget/client) are added, export them with explicit
// `.js` specifiers alongside this.
export type * from "./types";
