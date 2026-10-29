import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class Message {
  @Field(() => Int)
  id: number;

  @Field()
  content: string;

  @Field()
  createdAt: Date;
}
