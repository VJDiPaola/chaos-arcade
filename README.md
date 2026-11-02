# Chaos Arcade

Chat picks the chaos. You stick the landing.

A five-round Twitch timing game built with Codex. Each round gives chat 12 seconds to vote for a tiny target, reverse motion, or double speed. The streamer then has eight seconds to stop the marker in the target. A hit scores for the streamer; a miss scores for chat.

## Run locally

Requires Node.js 20 or newer. No dependency install, API key, or account is needed for rehearsal.

```powershell
npm.cmd run dev
```

Open `http://localhost:4173/`. Select **Open the vote**, wait for the ballot to lock, then **Play this round**. Click **Stop** or press Space. Use **Next round** until the five-round result. Rehearsal includes six clearly labeled local practice voters; turn them off in setup for an empty-ballot test or click the modifier cards to cast a practice vote. Step mode is available for manual, untimed rehearsal and defaults on when the browser requests reduced motion.

```powershell
npm.cmd test
npm.cmd run build
node scripts/serve.mjs --dist
```

The static production output is `dist/`. `vercel.json` uses that directory. The development server binds only to loopback and serves an explicit public-file allowlist.

## Connect Twitch

1. Register a **public** Twitch application in the [Twitch developer console](https://dev.twitch.tv/console/apps). Twitch requires a verified email and two-factor authentication for developer registration.
2. Register the exact redirect URI displayed in setup, including the trailing slash. For local use it is `http://localhost:4173/`; for a deployment it is the deployment's root URL.
3. Enter the public client ID in setup, or set `clientId` in `config.js`. The optional channel must match the account you authorize. Blank channel uses that account's channel.
4. Click **Connect Twitch** and authorize **read chat**. The app uses the implicit OAuth grant for a browser app, validates the token, opens Twitch EventSub, and waits for Twitch to confirm an enabled `channel.chat.message` subscription before displaying **TWITCH CONNECTED**.
5. Open a vote. In the connected channel's Twitch chat, send `!tiny`, `!reverse`, or `!speed` (`!1`, `!2`, `!3` also work). The channel owner can vote from their own chat; no separate bot account is required. The app itself cannot send messages.

Only votes received during the displayed ballot count. The latest choice per Twitch user replaces their previous one. Duplicate message IDs, out-of-order updates, expired ballots, and messages from other shared-chat channels are ignored. Ties use the displayed option order. Zero votes produces a classic round, with no claimed modifier winner. A chat interruption during voting clears that ballot so the streamer can reopen it after reconnecting.

The browser stores the token only in this tab's session storage. It never places tokens in source, logs, downloads, or exported reports. Disconnect clears the stored token. Closing the tab ends the local session. The app does not persist chat text or viewer identities; in-memory ballot identities are discarded on the next round or reset. Public client IDs are safe to publish; **never add a client secret to this project**.

## Record a demo

Capture the game browser window. **Presentation** removes setup and extra chrome; Escape or **Setup** restores it. Sound is optional and starts only after a user gesture. Start recording before starting a round; hiding the game tab during timed play ends that round to avoid an unseen timer.

Open `/record.html` in a separate tab for the bundled local screen recorder. Choose the game window and optional microphone, then record. Aim for 2:40; the utility stops at 2:55. Preview and download the WebM. It does not upload or publish. Screen/audio capture requires browser/OS permission and must be checked on the recording machine.

Rehearsal demonstrates gameplay but is not evidence of a live Twitch connection. A live integration demo must show an authenticated channel message changing the visible ballot and the locked game modifier. See `DEMO-NOTES.md` and `SUBMISSION.md` for the separate recording and submission checklist.

## Implementation

- `src/engine.js`: deterministic game state, vote validation, scoring, and motion.
- `src/twitch.js`: read-only Twitch OAuth validation, EventSub subscription, keepalive watchdog, bounded reconnect, and Twitch-directed socket migration.
- `src/oauth.js`: random CSRF state, callback validation, fragment cleanup, tab-local token handling.
- `src/app.js`: UI, keyboard controls, rehearsal voters, and game loop.
- `tests/`: deterministic game, OAuth, and simulated transport tests. Transport tests do not establish live Twitch proof.

No framework, paid service, LLM call, client secret, or server is needed at runtime. The serverless static app uses the streamer's authenticated Twitch account for its own channel only.

API references: [implicit OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#implicit-grant-flow), [EventSub WebSockets](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/), [chat message subscription](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage).

## Project provenance and Codex

Chaos Arcade is a new game build developed from direction B in the October 29 concept gallery. Codex helped explore five directions, develop the visual design, implement the deterministic game engine and Twitch adapter, and run automated and browser checks. Primary Codex session: `01a18078-9a23-7320-bc0f-0df82dca7f6b`.

The original concept used two Mobbin layout references: [Deezer](https://mobbin.com/screens/99c10655-19cb-4e02-a7c9-2f3a633a7052) for a prominent timer and bold choices, and [Uxcel](https://mobbin.com/screens/57f30d08-7ba2-45d9-a676-eb59df77c3dd) for a visual task beside a choice list. Gameplay mechanics, copy, and the acid-yellow/purple/pink palette are original. The earlier gallery remains separate from this runnable app.
