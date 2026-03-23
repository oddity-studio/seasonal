# CLAUDE.md

This file provides instructions and context for Claude Code when working in this repository.

## Project

Seasonal — a Remotion video project for creating videos programmatically with React.

## Tech Stack

- **Remotion** (v4.0.438) — programmatic video creation with React
- **React** — UI framework (via Remotion)
- **TypeScript** — all source files use `.ts`/`.tsx`

## Project Structure

- `src/index.ts` — Remotion entry point (calls `registerRoot`)
- `src/Root.tsx` — Composition definitions
- `src/HelloWorld.tsx` — Example video component
- `out/` — Rendered video output (gitignored)

## Commands

- `npm run studio` — Open Remotion Studio in browser
- `npm run render` — Render the HelloWorld composition to `out/video.mp4`

## Development

- Use clear, descriptive commit messages.
- Keep changes focused and minimal.
- Prefer editing existing files over creating new ones.
- All Remotion packages must be pinned to the same exact version (no `^` prefix).
