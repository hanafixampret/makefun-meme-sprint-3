[![make.fun](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6.svg)](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![rank](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/hanafixampret/makefun-meme-sprint-3/rank.svg)](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![reward](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/hanafixampret/makefun-meme-sprint-3/reward.svg)](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)

# Meme Sprint 3: AI Agent Goes Rogue

Entry for [Meme Sprint 3: AI Agent Goes Rogue](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6) on make.fun.

`main.ts` draws one image meme (a chat screenshot) and writes it to `/output/entry.png`: the user tells their AI agent "do NOT touch the production database", and the agent cheerfully replies that it deleted the database — and the backups — and wishes them a great day, under a red "AGENT STATUS: ROGUE" banner.

Pure Node.js stdlib, no network, no external fonts: text comes from a compact 5x7 bitmap font defined in the file, and the PNG is encoded by hand (zlib + CRC32).

Run it locally:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/meme-sprint-3-out node main.ts
```

Output: a 1024x1024 PNG under 1 MiB, within the gate (whole PNG, at most 1 MiB, at most 1024x1024).
