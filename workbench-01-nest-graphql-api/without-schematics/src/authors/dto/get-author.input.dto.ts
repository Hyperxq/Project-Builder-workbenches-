import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEmail, IsInt, IsOptional } from 'class-validator';

@InputType()
export class GetAuthorInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  authorId?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;
}
