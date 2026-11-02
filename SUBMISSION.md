# Chaos Arcade submission draft

Status: game built, locally verified, and publicly deployed. A round and security headers were checked on the public deployment. Twitch app Client ID is configured; live authorization, message verification, video upload, and submission remain pending. Update the remaining links and claims against final evidence before pasting into Devpost.

Local implementation checkpoint: `bd85168508a5689ce157b82863b5d027e29aea20`. All 18 deterministic tests and the production build passed. Browser checks completed a five-round session, timed-out challenge, disconnected-live guard, 390px layout, and 1280x720 presentation. Recorder assets load; actual screen and microphone capture still need a device test.

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

- Game URL: https://chaos-arcade-teamvince.vercel.app/ (public page and a rehearsal round verified).
- Source repository: https://github.com/VJDiPaola/chaos-arcade (public, main branch).
- YouTube demo: pending recording, upload, and logged-out playback.
- Main Codex session ID: `01a18078-9a23-7320-bc0f-0df82dca7f6b`.
- Real Twitch proof: team_vince account and 2FA confirmed by owner; app Client ID supplied. App authorization and message-to-vote readback pending.
- Devpost submission URL/status: pending.

## Built with

OpenAI Codex, JavaScript, HTML, CSS, Twitch EventSub, Twitch OAuth, Node.js test runner, Vercel.

## Known limits to preserve in the final entry

This is a hackathon prototype, not a proven streamer business or adoption claim. Rehearsal votes are synthetic. A real chat connection is distinct from an active livestream. Final implemented features and tests must be checked before describing them as complete.
