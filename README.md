# Game Center

An offline-first tchoukball scoreboard (Vue 3 + Vite PWA).

The app records a match as a **`GameSheet`** — an append-only event log. This
document specifies the `GameSheet` JSON format so it can be used as a shared
standard between the frontend, the backend, and any other app that produces or
consumes match data.

---

## The `GameSheet` format

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

### `GameSheet`

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

| Field         | Type                | Required | Notes                                                                       |
| ------------- | ------------------- | -------- | --------------------------------------------------------------------------- |
| `type`        | `TchoukEventType`   | yes      | What happened (see below).                                                  |
| `actor`       | `ActorType`         | no       | Who performed the action. Omitted on corrections and on `time_*` events.    |
| `target`      | `ActorType`         | no       | The team that receives the action. Set on `score_*` events.                 |
| `scoreChange` | `ScoreChangeType`   | no       | Present on `score_*` events: the team and signed delta.                     |
| `at`          | `string`            | yes      | ISO-8601 timestamp, e.g. `"2026-05-31T14:02:31.000Z"`.                      |

> The period an event belongs to is **not stored** — derive it from the log
> (see §2): the number of `time_period_start` events up to and including it,
> `null` before the first period (the first period is `1`).

### `ActorType`

A participant in an event. Modelled as an object so more information (player id,
name, position, …) can be added later without changing the event shape.

| Field    | Type     | Notes                       |
| -------- | -------- | --------------------------- |
| `teamId` | `TeamId` | The participant's team.     |

### `ScoreChangeType`

| Field       | Type     | Notes                                               |
| ----------- | -------- | --------------------------------------------------- |
| `teamId`    | `TeamId` | Team whose score changed (same as `target.teamId`). |
| `increment` | `number` | Signed delta: `+1` for a point, `-1` for a fix.     |

### Actor / target semantics

- **`actor`** is who *did* it — the shooter, or the player/team who conceded a
  given point. A cancelled point (`score_point_correction`) has **no actor**.
- **`target`** is the team that *receives* the action — the team that benefits
  from the point (the scoring team, or the team given the point), or whose
  point is being cancelled.

### `TchoukEventType`

Two families: **time** events (the match timeline; no `actor`/`target`) and
**score** events (carry `target` + `scoreChange`).

| `type`                    | Family | Meaning                                         | `actor`            | `target`         | `scoreChange` |
| ------------------------- | ------ | ----------------------------------------------- | ------------------ | ---------------- | ------------- |
| `time_game_start`         | time   | The match started.                              | —                  | —                | —             |
| `time_period_start`       | time   | A period started (increments the period count). | —                  | —                | —             |
| `time_period_end`         | time   | The current period ended.                       | —                  | —                | —             |
| `time_game_end`           | time   | The match ended.                                | —                  | —                | —             |
| `score_point_scored`      | score  | A team scored for itself.                       | scoring team       | scoring team     | `+1`          |
| `score_point_given`       | score  | A team was given a point by an opponent.        | conceding opponent | benefiting team  | `+1`          |
| `score_point_correction`  | score  | Manual correction (cancel a point).             | — (none)           | team losing pt.  | `-1`          |

---

## Worked example

```json
{
  "teams": [
    { "id": "italy", "name": "Italy" },
    { "id": "suisse", "name": "Suisse" }
  ],
  "events": [
    { "type": "time_game_start",   "at": "2026-05-31T14:02:11.000Z" },
    { "type": "time_period_start", "at": "2026-05-31T14:02:14.000Z" },
    { "type": "score_point_scored", "at": "2026-05-31T14:02:31.000Z",
      "actor": { "teamId": "italy" }, "target": { "teamId": "italy" },
      "scoreChange": { "teamId": "italy", "increment": 1 } },
    { "type": "score_point_given", "at": "2026-05-31T14:03:05.000Z",
      "actor": { "teamId": "suisse" }, "target": { "teamId": "italy" },
      "scoreChange": { "teamId": "italy", "increment": 1 } },
    { "type": "score_point_correction", "at": "2026-05-31T14:03:40.000Z",
      "target": { "teamId": "italy" },
      "scoreChange": { "teamId": "italy", "increment": -1 } },
    { "type": "time_period_end",   "at": "2026-05-31T14:14:00.000Z" }
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

**An event's period** — the number of `time_period_start` events up to and
including it (`null` if none yet; the first period is `1`):

```
eventPeriod(i) = count(events[0..i] where type == "time_period_start") or null
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

- `teams[].id` are unique; every `actor.teamId` / `target.teamId` /
  `scoreChange.teamId` references an existing team.
- `events` are ordered by non-decreasing `at`.
- The sequence of `time_*` events is a valid walk of the state machine in §3.
- `score_*` events occur only while the derived phase is `period_started`, and
  carry a `target` and a `scoreChange` whose `teamId` equals `target.teamId`.
- `score_point_scored` → `actor` and `target` are the same team, `increment == 1`;
  `score_point_given` → `actor` is the conceding opponent, `target` the
  beneficiary, `increment == 1`;
  `score_point_correction` → no `actor`, `increment == -1`.

Because the sheet is an append-only log, a backend can store it as-is (e.g. a
JSON column or an events table) and recompute any view on demand.

---

## Reference implementation

The canonical types and derivation helpers live in
[`src/types.ts`](src/types.ts):

- Types: `GameSheet`, `TchoukTeam`, `TchoukEvent`, `TchoukEventType`,
  `ActorType`, `ScoreChangeType`, `TeamId`, `GamePhase`.
- Helpers: `computeScores`, `currentPhase`, `currentPeriod`, `eventPeriod`,
  `gameStartedAt`.

The runtime match state is managed by the store in
[`src/stores/useMatchStore.ts`](src/stores/useMatchStore.ts), which holds the
single reactive `sheet` and exposes the derived values plus the only mutations
allowed (the actions that append events). The store persists the sheet to
`localStorage` (key `tchoukscorer:sheet:v1`) on every change and restores it on
load, so a page refresh resumes the same match.

---

## Development

```bash
npm install
npm run dev          # start the dev server
npm run build        # type-check (vue-tsc) + production build
npm run type-check   # type-check only
```
