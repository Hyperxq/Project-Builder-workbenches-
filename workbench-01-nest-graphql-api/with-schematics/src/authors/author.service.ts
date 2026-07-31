import { Injectable } from '@nestjs/common';
import { AuthorRepository } from './author.repository';
import { Author } from './entities/author.entity';
import { CreateAuthorInput } from './dto/create-author.input.dto';
import { GetAuthorInput } from './dto/get-author.input.dto';
import {
  UpdateAuthorArgs,
  UpdateAuthorPayload,
} from './dto/update-author.input.dto';

@Injectable()
export class AuthorService {
  constructor(private readonly repo: AuthorRepository) {}

  async create(createAuthor: CreateAuthorInput): Promise<Author> {
    return await this.repo.create<CreateAuthorInput, Author>(createAuthor);
  }

  async findAll(): Promise<Author[]> {
    return await this.repo.findMany<Author>({});
  }

  async findOne(getAuthor: GetAuthorInput): Promise<Author | null> {
    return await this.repo.findOne<Author>(getAuthor);
  }

  async update({ query, payload }: UpdateAuthorArgs): Promise<Author | null> {
    return await this.repo.update<UpdateAuthorPayload, Author>(query, payload, {
      upsert: false,
    });
  }

  async remove(removeAuthor: GetAuthorInput): Promise<Author | null> {
    return await this.repo.remove<Author>(removeAuthor);
  }
}
