import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

import { readSecret } from './secrets.js';

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pool = new Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: readSecret('DB_USER'),
    password: readSecret('DB_PASSWORD'),
    database: readSecret('DB_NAME'),
  });

  async onModuleDestroy() {
    await this.pool.end();
  }
}
