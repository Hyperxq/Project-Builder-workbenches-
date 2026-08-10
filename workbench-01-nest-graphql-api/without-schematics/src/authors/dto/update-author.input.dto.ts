import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { GetAuthorInput } from './get-author.input.dto';

@InputType()
export class UpdateAuthorPayload {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  authorId?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  fullName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  country?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@InputType()
export class UpdateAuthorArgs {
  @Field(() => GetAuthorInput)
  @ValidateNested()
  @Type(() => GetAuthorInput)
  query!: GetAuthorInput;

  @Field(() => UpdateAuthorPayload)
  @ValidateNested()
  @Type(() => UpdateAuthorPayload)
  payload!: UpdateAuthorPayload;
}
