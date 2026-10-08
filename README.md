# sasuke-bot

Minecraft AFK / greeting bot for the Havencraft server.

- **Server:** `mc.havencraft.pro:2566`
- **Bot username:** `SASUKE_440`
- **Mode:** Java, offline (non-premium), AuthMe — the account is already registered, the bot only logs in
- **Hosting:** GitHub Actions, free, a fresh run every 6 hours

## Features

1. Logs in with AuthMe automatically a few seconds after joining. The full login command comes from the `MC_LOGIN_CMD` repository Secret — it is never in the code.
2. Double-crouches (sneak) every 2 minutes.
3. When a player comes within 6 blocks, it looks at them and double-crouches to greet them — at most once per minute for the same player.
4. Looks in a random direction every 30 seconds (anti-AFK).
5. Reconnects 15 seconds after a disconnect. If the server is down / unreachable, it retries every 2 minutes.

## Files to upload to this repo

Upload these files to the **root** of the repository:

- `bot.js`
- `package.json`
- `README.md` (this file)

Then create the workflow file yourself in the repo at:

```
.github/workflows/mc-bot.yml
```

using the `mc-bot.yml` content provided in chat.

## Required Secret: MC_LOGIN_CMD

1. Open: https://github.com/mr4953652-lab/sasuke-bot/settings/secrets/actions/new
2. **Name:** `MC_LOGIN_CMD`
3. **Secret:** your full AuthMe login command (starting with `/login `), typed by you there only.
4. Click **Add secret**.

GitHub never shows the secret again after saving, and it is masked in workflow logs.

## Run it manually

1. Open: https://github.com/mr4953652-lab/sasuke-bot/actions/workflows/mc-bot.yml
2. Click **Run workflow** (right side) → **Run workflow** (green button).
3. Click the running entry to watch live logs. You should see `Spawned in server.` and then `AuthMe login command sent.`

The bot then runs for up to ~5 hours 50 minutes in that run. The schedule starts a new run every 6 hours.

> Note: keep only one run active. The workflow is already set with `concurrency` + `cancel-in-progress`, so a new run replaces the old one automatically.

## Run locally (optional, for testing)

```bash
npm install
MC_LOGIN_CMD='/login <your-password>' node bot.js
```

Do not put the real command in any file — only in the environment variable / GitHub Secret.
