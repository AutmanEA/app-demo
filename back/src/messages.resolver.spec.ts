import { DbService } from "./db.service.js";
import { MAX_LENGTH, MessagesResolver } from "./messages.resolver.js";

function fakeDb(rows: unknown[] = []) {
  const calls: unknown[][] = [];
  const db = {
    pool: {
      query: async (...args: unknown[]) => {
        calls.push(args);
        return { rows };
      },
    },
  } as unknown as DbService;
  return { db, calls };
}

describe('MessagesResolver', () => {
  it('renvoie les messages de la base', async () => {
    const { db } = fakeDb([{ id: 1, content: "Salut", createdAt: new Date() }]);
    const resolver = new MessagesResolver(db);

    const result = await resolver.messages();

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Salut');
  });

  it('enregistre le message sans les espaces autour', async () => {
    const { db, calls } = fakeDb([{ id: 1, content: "Bonjour", createdAt: new Date() }]);
    const resolver = new MessagesResolver(db);

    await resolver.addMessage('   Bonjour    ');

    expect(calls[0][1]).toEqual(['Bonjour']);
  });

  it('refuse un message vide', async () => {
    const { db, calls } = fakeDb();
    const resolver = new MessagesResolver(db);

    await expect(resolver.addMessage('   ')).rejects.toThrow('vide');
    expect(calls).toHaveLength(0);
  });

  it('refuse un message trop long', async () => {
    const { db } = fakeDb();
    const resolver = new MessagesResolver(db);

    await expect(resolver.addMessage('a'.repeat(MAX_LENGTH + 1))).rejects.toThrow();
  })
})
