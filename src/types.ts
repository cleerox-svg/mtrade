export interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY: string;
  DISCORD_WEBHOOK_URL?: string;
}

export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: string;
  created_at: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}
