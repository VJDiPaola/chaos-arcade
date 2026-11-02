# Chaos Arcade submission draft

Status: game built, publicly deployed, and connected to actual Twitch chat. A real `!tiny` message from `team_vince` selected Tiny Target, followed by a completed challenge and chat score increment. The channel was offline. Recording, video upload, and submission remain pending. Devpost project creation currently stalls without opening an editor or producing a draft.

Implementation checkpoint: `f447079`. All 19 deterministic tests and the production build passed, including a regression for the browser fetch receiver exposed during live testing. Browser checks completed a five-round session, timed-out challenge, disconnected-live guard, 390px layout, and 1280x720 presentation. Recorder assets load; actual screen and microphone capture still need a device test.

## Project name

Chaos Arcade

## Tagline

Chat picks the chaos. You stick the landing.

## Description draft

Chaos Arcade is a short competitive game for Twitch streamers and their viewers. Viewers vote in chat for a modifier such as Tiny Target, Reverse, or Double Speed. The streamer then tries to stop a moving marker inside the target. Votes, the chosen obstacle, and the result stay visible so viewers can follow the effect of their decisions.

The match is designed for quick rounds and a small starting audience. One viewer can influence a challenge. Each viewer gets one ballot per voting window, with their latest valid choice replacing their previous vote.

The implementation uses ordinary browser code for the game and Twitch EventSub WebSocket for incoming chat. Twitch authorization requests read-only chat access. A separate, visibly labeled rehearsal mode lets people test the game before connecting a channel.

I used OpenAI Codex to explore five gameplay and visual directions, choose the arcade concept, implement the game state and Twitch integration, and develop checks for voting and session behavior. The visual direction uses acid yellow, purple, and pink with large controls and short instructions intended to be legible in a recording or broadcast.

## Required links and evidence

- Game URL: https://chaos-arcade-teamvince.vercel.app/ (public page, rehearsal, and an actual Twitch-selected round verified).
- Source repository: https://github.com/VJDiPaola/chaos-arcade (public, main branch).
- YouTube demo: pending recording, upload, and logged-out playback.
- Main Codex session ID: `01a18078-9a23-7320-bc0f-0df82dca7f6b`.
- Real Twitch proof: read-only authorization and enabled EventSub subscription for team_vince; `!tiny` accepted as one vote, Tiny Target selected, challenge completed with chat score 1. Channel offline; no active broadcast claimed.
- Devpost submission URL/status: pending.

## Built with

OpenAI Codex, JavaScript, HTML, CSS, Twitch EventSub, Twitch OAuth, Node.js test runner, Vercel.

## Known limits to preserve in the final entry

This is a hackathon prototype, not a proven streamer business or adoption claim. Rehearsal votes are synthetic. A real chat connection is distinct from an active livestream. Final implemented features and tests must be checked before describing them as complete.
