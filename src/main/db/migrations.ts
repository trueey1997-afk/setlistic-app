import type Database from 'better-sqlite3'

const NOW = `(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`

/**
 * Append-only list of schema changes. Index + 1 is the schema version stored in
 * PRAGMA user_version. Never edit a migration that has shipped; add a new one.
 */
const MIGRATIONS: string[] = [
  // 1: initial schema
  `
  CREATE TABLE songs (
    id            INTEGER PRIMARY KEY,
    title         TEXT    NOT NULL CHECK (length(trim(title)) > 0),
    artist        TEXT    NOT NULL DEFAULT '',
    musical_key   TEXT,
    bpm           INTEGER CHECK (bpm IS NULL OR bpm BETWEEN 20 AND 400),
    duration_sec  INTEGER CHECK (duration_sec IS NULL OR duration_sec >= 0),
    content       TEXT    NOT NULL DEFAULT '',
    notes         TEXT    NOT NULL DEFAULT '',
    created_at    TEXT    NOT NULL DEFAULT ${NOW},
    updated_at    TEXT    NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX songs_title ON songs (title COLLATE NOCASE);

  CREATE TABLE setlists (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
    kind        TEXT NOT NULL DEFAULT 'gig' CHECK (kind IN ('gig', 'rehearsal')),
    event_date  TEXT,
    venue       TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT ${NOW},
    updated_at  TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX setlists_event_date ON setlists (event_date);

  -- Many-to-many with an order. Its own id lets one song appear twice in a set.
  CREATE TABLE setlist_songs (
    id            INTEGER PRIMARY KEY,
    setlist_id    INTEGER NOT NULL REFERENCES setlists (id) ON DELETE CASCADE,
    song_id       INTEGER NOT NULL REFERENCES songs (id) ON DELETE CASCADE,
    position      INTEGER NOT NULL,
    key_override  TEXT,
    note          TEXT    NOT NULL DEFAULT '',
    UNIQUE (setlist_id, position)
  );
  CREATE INDEX setlist_songs_song ON setlist_songs (song_id);
  `,

  // 2: bands & members, song links/status/tags, instrument notes, practice progress.
  // Songs and setlists are rebuilt to add a NOT NULL band_id (SQLite can't ALTER that in).
  // Existing data moves into a default band so nothing is lost.
  `
  CREATE TABLE bands (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
    created_at  TEXT NOT NULL DEFAULT ${NOW},
    updated_at  TEXT NOT NULL DEFAULT ${NOW}
  );

  -- Members are just names on this device, not accounts
  CREATE TABLE members (
    id           INTEGER PRIMARY KEY,
    band_id      INTEGER NOT NULL REFERENCES bands (id) ON DELETE CASCADE,
    name         TEXT    NOT NULL CHECK (length(trim(name)) > 0),
    instruments  TEXT    NOT NULL DEFAULT '[]',  -- JSON array of instrument ids
    created_at   TEXT    NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX members_band ON members (band_id);

  INSERT INTO bands (id, name)
  SELECT 1, 'วงของฉัน' WHERE EXISTS (SELECT 1 FROM songs) OR EXISTS (SELECT 1 FROM setlists);

  CREATE TABLE songs_v2 (
    id            INTEGER PRIMARY KEY,
    band_id       INTEGER NOT NULL REFERENCES bands (id) ON DELETE CASCADE,
    title         TEXT    NOT NULL CHECK (length(trim(title)) > 0),
    artist        TEXT    NOT NULL DEFAULT '',
    musical_key   TEXT,
    bpm           INTEGER CHECK (bpm IS NULL OR bpm BETWEEN 20 AND 400),
    duration_sec  INTEGER CHECK (duration_sec IS NULL OR duration_sec >= 0),
    youtube_url   TEXT    NOT NULL DEFAULT '',
    chord_url     TEXT    NOT NULL DEFAULT '',
    status        TEXT    NOT NULL DEFAULT 'learning' CHECK (status IN ('ready', 'learning', 'idea')),
    tags          TEXT    NOT NULL DEFAULT '[]',     -- JSON array of strings
    content       TEXT    NOT NULL DEFAULT '',
    notes         TEXT    NOT NULL DEFAULT '',
    created_at    TEXT    NOT NULL DEFAULT ${NOW},
    updated_at    TEXT    NOT NULL DEFAULT ${NOW}
  );
  INSERT INTO songs_v2 (id, band_id, title, artist, musical_key, bpm, duration_sec, content, notes, created_at, updated_at)
  SELECT id, 1, title, artist, musical_key, bpm, duration_sec, content, notes, created_at, updated_at FROM songs;
  DROP TABLE songs;
  ALTER TABLE songs_v2 RENAME TO songs;
  CREATE INDEX songs_band_title ON songs (band_id, title COLLATE NOCASE);

  CREATE TABLE setlists_v2 (
    id          INTEGER PRIMARY KEY,
    band_id     INTEGER NOT NULL REFERENCES bands (id) ON DELETE CASCADE,
    name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
    kind        TEXT NOT NULL DEFAULT 'gig' CHECK (kind IN ('gig', 'rehearsal')),
    event_date  TEXT,
    event_time  TEXT,
    venue       TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT ${NOW},
    updated_at  TEXT NOT NULL DEFAULT ${NOW}
  );
  INSERT INTO setlists_v2 (id, band_id, name, kind, event_date, venue, notes, created_at, updated_at)
  SELECT id, 1, name, kind, event_date, venue, notes, created_at, updated_at FROM setlists;
  DROP TABLE setlists;
  ALTER TABLE setlists_v2 RENAME TO setlists;
  CREATE INDEX setlists_band_date ON setlists (band_id, event_date);

  CREATE TABLE instrument_notes (
    id          INTEGER PRIMARY KEY,
    song_id     INTEGER NOT NULL REFERENCES songs (id) ON DELETE CASCADE,
    member_id   INTEGER REFERENCES members (id) ON DELETE SET NULL,
    instrument  TEXT    NOT NULL,
    note        TEXT    NOT NULL DEFAULT '',
    tab_url     TEXT    NOT NULL DEFAULT '',
    updated_at  TEXT    NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX instrument_notes_song ON instrument_notes (song_id);

  -- One row per (setlist item, member). No row means 'not_started'.
  CREATE TABLE practice_progress (
    item_id     INTEGER NOT NULL REFERENCES setlist_songs (id) ON DELETE CASCADE,
    member_id   INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    status      TEXT    NOT NULL CHECK (status IN ('not_started', 'practicing', 'ready')),
    updated_at  TEXT    NOT NULL DEFAULT ${NOW},
    PRIMARY KEY (item_id, member_id)
  ) WITHOUT ROWID;
  `,

  // 3: tick off songs as they're played during the show
  `
  ALTER TABLE setlist_songs ADD COLUMN played INTEGER NOT NULL DEFAULT 0 CHECK (played IN (0, 1));
  `,

  // 4: a map/info link beside the venue name
  `
  ALTER TABLE setlists ADD COLUMN venue_url TEXT NOT NULL DEFAULT '';
  `
]

export function migrate(db: Database.Database): void {
  const current = db.pragma('user_version', { simple: true }) as number
  if (current > MIGRATIONS.length) {
    throw new Error(
      `ฐานข้อมูลเป็นเวอร์ชัน ${current} ซึ่งใหม่กว่าแอปนี้ (${MIGRATIONS.length}) กรุณาอัปเดต Setlistic`
    )
  }
  if (current === MIGRATIONS.length) return

  // Table rebuilds drop and recreate referenced tables; with foreign keys on, that would
  // cascade-delete rows. The pragma is a no-op inside a transaction, so set it out here.
  db.pragma('foreign_keys = OFF')
  try {
    for (let version = current; version < MIGRATIONS.length; version++) {
      db.transaction(() => {
        db.exec(MIGRATIONS[version])
        const broken = db.pragma('foreign_key_check') as unknown[]
        if (broken.length) throw new Error(`Migration ${version + 1} left broken references`)
        db.pragma(`user_version = ${version + 1}`)
      })()
    }
  } finally {
    db.pragma('foreign_keys = ON')
  }
}
