CREATE TABLE IF NOT EXISTS entries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    message    TEXT    NOT NULL,
    created_at TEXT    NOT NULL
);
