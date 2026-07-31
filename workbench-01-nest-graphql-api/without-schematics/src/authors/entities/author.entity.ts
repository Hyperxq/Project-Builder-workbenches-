import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

@ObjectType()
export class Author {
  @Field(() => Int)
  @IsInt()
  authorId: number;

  @Field(() => String)
  @IsString()
  fullName: string;

  @Field(() => String)
  @IsEmail()
  email: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  country?: string;

  @Field(() => Boolean)
  @IsBoolean()
  active: boolean;
}
