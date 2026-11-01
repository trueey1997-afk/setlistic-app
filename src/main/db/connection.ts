import Database from 'better-sqlite3'
import { migrate } from './migrations'

export type Db = Database.Database

export function openDatabase(file: string): Db {
  const db = new Database(file)
  // WAL keeps reads fast while writing and survives crashes better than the default journal
  db.pragma('journal_mode = WAL')
  // SQLite ships with foreign keys off; ON DELETE CASCADE needs them on
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}
