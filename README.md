# Tchouk Scorer

An offline-first tchoukball scoreboard (Vue 3 + Vite PWA).

The app records a match as a **`TchoukSheet`** — an append-only event log. This
document specifies the `TchoukSheet` JSON format so it can be used as a shared
standard between the frontend, the backend, and any other app that produces or
consumes match data.

---

## The `TchoukSheet` format

A sheet stores **only two things**: the teams and the chronological event log.
Everything else a UI might show — current scores, the period number, the match
phase, the start time — is **derived from `events`** and is never stored on the
sheet. This keeps the event log the single source of truth.

```jsonc
{
  "teams": [
    { "id": "italy", "name": "Italy" },
    { "id": "switzerland-m15-bejune", "name": "Switzerland M15 BEJUNE" }
  ],
  "events": [
    /* TchoukEvent objects, in the order they happened */
  ]
}
```

### `TchoukSheet`

| Field    | Type            | Notes                                              |
| -------- | --------------- | -------------------------------------------------- |
| `teams`  | `TchoukTeam[]`  | The teams in the match.                            |
| `events` | `TchoukEvent[]` | Append-only log, ordered oldest → newest.          |

### `TchoukTeam`

| Field  | Type               | Notes                                                  |
| ------ | ------------------ | ------------------------------------------------------ |
| `id`   | `string \| number` | Stable team identifier (`TeamId`). Unique in a sheet.  |
| `name` | `string`           | Display name.                                          |

### `TchoukEvent`

A single recorded action.

| Field         | Type                     | Required | Notes                                                            |
| ------------- | ------------------------ | -------- | ---------------------------------------------------------------- |
| `type`        | `TchoukEventType`        | yes      | What happened (see below).                                       |
| `teamId`      | `TeamId \| null`         | yes      | Team the event belongs to; `null` for match-wide (time) events.  |
| `period`      | `number`                 | yes      | Period the event occurred in (`0` before the first period).      |
| `at`          | `string`                 | yes      | ISO-8601 timestamp, e.g. `"2026-05-31T14:02:31.000Z"`.           |
| `scoreChange` | `ScoreChangeType`        | no       | Present on `score_point_*` events.                               |
| `givenBy`     | `TeamId`                 | no       | Present on `score_point_given`: the opponent that conceded.      |

### `ScoreChangeType`

| Field       | Type     | Notes                                               |
| ----------- | -------- | --------------------------------------------------- |
| `teamId`    | `TeamId` | Team whose score changed.                           |
| `increment` | `number` | Signed delta: `+1` for a point, `-1` for a fix.     |

### `TchoukEventType`

Two families: **time** events (the match timeline, `teamId` is `null`) and
**score** events (carry a `scoreChange`).

| `type`                    | Family | Meaning                                         | Carries                          |
| ------------------------- | ------ | ----------------------------------------------- | -------------------------------- |
| `time_game_start`         | time   | The match started.                              | —                                |
| `time_period_start`       | time   | A period started (increments the period count). | —                                |
| `time_period_end`         | time   | The current period ended.                       | —                                |
| `time_game_end`           | time   | The match ended.                                | —                                |
| `score_point_scored`      | score  | A team scored for itself.                       | `scoreChange` (`+1`)             |
| `score_point_given`       | score  | A team was given a point by an opponent.        | `scoreChange` (`+1`), `givenBy`  |
| `score_point_correction`  | score  | Manual correction (undo a point).               | `scoreChange` (`-1`)             |

---

## Worked example

```json
{
  "teams": [
    { "id": "italy", "name": "Italy" },
    { "id": "suisse", "name": "Suisse" }
  ],
  "events": [
    { "type": "time_game_start",   "teamId": null,    "period": 0, "at": "2026-05-31T14:02:11.000Z" },
    { "type": "time_period_start", "teamId": null,    "period": 0, "at": "2026-05-31T14:02:14.000Z" },
    { "type": "score_point_scored","teamId": "italy", "period": 1, "at": "2026-05-31T14:02:31.000Z",
      "scoreChange": { "teamId": "italy", "increment": 1 } },
    { "type": "score_point_given", "teamId": "italy", "period": 1, "at": "2026-05-31T14:03:05.000Z",
      "scoreChange": { "teamId": "italy", "increment": 1 }, "givenBy": "suisse" },
    { "type": "score_point_correction", "teamId": "italy", "period": 1, "at": "2026-05-31T14:03:40.000Z",
      "scoreChange": { "teamId": "italy", "increment": -1 } },
    { "type": "time_period_end",   "teamId": null,    "period": 1, "at": "2026-05-31T14:14:00.000Z" }
  ]
}
```

Derived from the log above: phase = `period_ended`, period = `1`,
scores = `{ "italy": 1, "suisse": 0 }`, startedAt = `"2026-05-31T14:02:11.000Z"`.

---

## Rules

### 1. The event log is the single source of truth

Producers append events; they do not store derived values. Consumers compute
what they need from `events`. The same algorithms must be used everywhere so
all apps agree.

### 2. Deriving values from the log

**Scores** — fold the `scoreChange` deltas:

```
scores = {}
for event in events:
    if event.scoreChange:
        scores[event.scoreChange.teamId] += event.scoreChange.increment
```

**Current period** — the number of periods started:

```
period = count(events where type == "time_period_start")
```

**Start time** — the timestamp of the first `time_game_start` (or `null`):

```
startedAt = first(events where type == "time_game_start").at  // else null
```

**Phase** — determined by the most recent `time_*` event:

| Last time event       | Phase            |
| --------------------- | ---------------- |
| (none)                | `pregame`        |
| `time_game_start`     | `game_started`   |
| `time_period_start`   | `period_started` |
| `time_period_end`     | `period_ended`   |
| `time_game_end`       | `game_ended`     |

### 3. Match phase state machine

Time events must follow these transitions. Scoring is only valid while the
phase is `period_started`.

```
pregame        --time_game_start-->   game_started
game_started   --time_period_start--> period_started
game_started   --time_game_end-->     game_ended
period_started --time_period_end-->   period_ended
period_started --time_game_end-->     game_ended
period_ended   --time_period_start--> period_started   (next period; period + 1)
period_ended   --time_game_end-->     game_ended
```

### 4. Deletion rules

Events may be removed from the log under these constraints:

- **Score events** (`score_point_*`) may be deleted at any position. Deleting
  one simply removes its `scoreChange` from the fold.
- **Time events** (`time_*`) may be deleted **only if they are the last event
  in the log**, so the phase state machine stays consistent.

A "reset" clears `events` entirely (the `teams` are kept).

### 5. Validation guidance (backend)

A backend accepting a sheet should verify:

- `teams[].id` are unique; every `teamId` / `givenBy` / `scoreChange.teamId`
  references an existing team (or is `null` where allowed).
- `events` are ordered by non-decreasing `at`.
- The sequence of `time_*` events is a valid walk of the state machine in §3.
- `score_*` events occur only while the derived phase is `period_started`.
- `score_point_scored` → `scoreChange.increment == 1`;
  `score_point_given` → `increment == 1` **and** `givenBy` is set;
  `score_point_correction` → `increment == -1`.

Because the sheet is an append-only log, a backend can store it as-is (e.g. a
JSON column or an events table) and recompute any view on demand.

---

## Reference implementation

The canonical types and derivation helpers live in
[`src/types.ts`](src/types.ts):

- Types: `TchoukSheet`, `TchoukTeam`, `TchoukEvent`, `TchoukEventType`,
  `ScoreChangeType`, `TeamId`, `GamePhase`.
- Helpers: `computeScores`, `currentPhase`, `currentPeriod`, `gameStartedAt`.

The runtime match state is managed by the store in
[`src/stores/useMatchStore.ts`](src/stores/useMatchStore.ts), which holds the
single reactive `sheet` and exposes the derived values plus the only mutations
allowed (the actions that append events).

---

## Development

```bash
npm install
npm run dev          # start the dev server
npm run build        # type-check (vue-tsc) + production build
npm run type-check   # type-check only
```
