import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// KBO 팀 순위 캐시
export const kboTeamRank = mysqlTable("kbo_team_rank", {
  id: int("id").autoincrement().primaryKey(),
  season: varchar("season", { length: 4 }).notNull(),
  rank: int("rank").notNull(),
  teamName: varchar("teamName", { length: 32 }).notNull(),
  games: int("games").notNull(),
  wins: int("wins").notNull(),
  losses: int("losses").notNull(),
  draws: int("draws").notNull(),
  winRate: varchar("winRate", { length: 8 }),
  gameBehind: varchar("gameBehind", { length: 8 }),
  recentTen: varchar("recentTen", { length: 32 }),
  streak: varchar("streak", { length: 16 }),
  home: varchar("home", { length: 16 }),
  away: varchar("away", { length: 16 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// KBO 타자 기록 캐시
export const kboHitters = mysqlTable("kbo_hitters", {
  id: int("id").autoincrement().primaryKey(),
  season: varchar("season", { length: 4 }).notNull(),
  rank: int("rank"),
  playerName: varchar("playerName", { length: 32 }).notNull(),
  teamName: varchar("teamName", { length: 32 }).notNull(),
  avg: varchar("avg", { length: 8 }),
  games: int("games"),
  pa: int("pa"),
  ab: int("ab"),
  runs: int("runs"),
  hits: int("hits"),
  doubles: int("doubles"),
  triples: int("triples"),
  hr: int("hr"),
  tb: int("tb"),
  rbi: int("rbi"),
  sac: int("sac"),
  sf: int("sf"),
  bb: int("bb"),
  ibb: int("ibb"),
  hbp: int("hbp"),
  so: int("so"),
  gdp: int("gdp"),
  sb: int("sb"),
  cs: int("cs"),
  ops: varchar("ops", { length: 8 }),
  slg: varchar("slg", { length: 8 }),
  obp: varchar("obp", { length: 8 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// KBO 투수 기록 캐시
export const kboPitchers = mysqlTable("kbo_pitchers", {
  id: int("id").autoincrement().primaryKey(),
  season: varchar("season", { length: 4 }).notNull(),
  rank: int("rank"),
  playerName: varchar("playerName", { length: 32 }).notNull(),
  teamName: varchar("teamName", { length: 32 }).notNull(),
  era: varchar("era", { length: 8 }),
  games: int("games"),
  wins: int("wins"),
  losses: int("losses"),
  saves: int("saves"),
  holds: int("holds"),
  wpct: varchar("wpct", { length: 8 }),
  ip: varchar("ip", { length: 8 }),
  hits: int("hits"),
  hr: int("hr"),
  bb: int("bb"),
  hbp: int("hbp"),
  so: int("so"),
  runs: int("runs"),
  er: int("er"),
  whip: varchar("whip", { length: 8 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// KBO 경기 일정/결과 캐시
export const kboSchedule = mysqlTable("kbo_schedule", {
  id: int("id").autoincrement().primaryKey(),
  gameDate: varchar("gameDate", { length: 12 }).notNull(),
  homeTeam: varchar("homeTeam", { length: 32 }).notNull(),
  awayTeam: varchar("awayTeam", { length: 32 }).notNull(),
  homeScore: int("homeScore"),
  awayScore: int("awayScore"),
  stadium: varchar("stadium", { length: 64 }),
  status: varchar("status", { length: 16 }),
  gameTime: varchar("gameTime", { length: 8 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KboTeamRank = typeof kboTeamRank.$inferSelect;
export type KboHitter = typeof kboHitters.$inferSelect;
export type KboPitcher = typeof kboPitchers.$inferSelect;
export type KboSchedule = typeof kboSchedule.$inferSelect;
