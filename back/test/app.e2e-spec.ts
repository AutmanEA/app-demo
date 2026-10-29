import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { DbService } from '../src/db.service.js';

describe('API GraphQL (intégration)', () => {
  let app: INestApplication;

  const gql = (query: string, variables?: object) =>
    request(app.getHttpServer()).post('/graphql').send({ query, variables });

  beforeAll(async () => {
    if (process.env.DB_NAME !== 'app_test') {
      throw new Error(`Tests lancés sur "${process.env.DB_NAME}" : refusé, base de test attendue`);
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await app.get(DbService).pool.query('TRUNCATE message RESTART IDENTITY');
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health répond ok', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body.status).toBe('ok');
  });

  it('ajoute puis liste un message', async () => {
    await gql(`mutation ($c: String!) { addMessage(content: $c) { id } }`, { c: 'Bonjour' })
      .expect(200);

    const res = await gql(`{ messages { content } }`).expect(200);

    expect(res.body.data.messages).toEqual([{ content: 'Bonjour' }]);
  });

  it('renvoie une erreur GraphQL pour un message vide', async () => {
    const res = await gql(`mutation { addMessage(content: "   ") { id } }`);

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toContain('vide');
  });
});
