import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Pool } from "pg";


@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  readonly pool = new Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  async onModuleInit() {
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS message (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
