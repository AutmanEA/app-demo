import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Message } from "./message.model.js";
import { DbService } from "./db.service.js";
import { BadRequestException } from "@nestjs/common";

export const MAX_LENGTH = 500;

@Resolver(() => Message)
export class MessagesResolver {
  constructor(private readonly db: DbService) {}

  @Query(() => [Message])
  async messages(): Promise<Message[]> {
    const { rows } = await this.db.pool.query(
      `SELECT id, content, created_at AS "createdAt"
      FROM message ORDER BY created_at DESC LIMIT 50`,
    );
    return rows;
  }

  @Mutation(() => [Message])
  async addMessage(@Args('content') content: string): Promise<Message> {
    const cleanContent = content.trim();
    if (!cleanContent) throw new BadRequestException('Le message est vide');
    if (cleanContent.length > MAX_LENGTH) throw new BadRequestException(`Le message dépasse ${MAX_LENGTH} caractères`);

    const { rows } = await this.db.pool.query(
      `INSERT INTO message (content) VALUES ($1)
      RETURNING id, content, created_at AS "createdAt"`,
      [cleanContent],
    );
    return rows[0];
  }
}
