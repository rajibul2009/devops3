import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class Role {
  @Field(() => ID)
  id: string

  @Field(() => String)
  name: string
}