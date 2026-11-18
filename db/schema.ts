import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
export const entries = sqliteTable(
  "album_entries",
  {
    owner: text("owner").notNull(),
    id: text("id").notNull(),
    kind: text("kind").notNull(),
    content: text("content").notNull(),
    revision: integer("revision").notNull(),
  },
  (t) => [primaryKey({ columns: [t.owner, t.id] })],
);
