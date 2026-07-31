import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { TryAndCatch } from '@app/common';
import { AuthorService } from './author.service';
import { Author } from './entities/author.entity';
import { CreateAuthorInput } from './dto/create-author.input.dto';
import { GetAuthorInput } from './dto/get-author.input.dto';
import { UpdateAuthorArgs } from './dto/update-author.input.dto';

@Resolver(() => Author)
export class AuthorResolver {
  constructor(private readonly authorService: AuthorService) {}

  @Mutation(() => Author, { name: 'createAuthor' })
  @TryAndCatch()
  create(@Args('createAuthor') createAuthor: CreateAuthorInput) {
    return this.authorService.create(createAuthor);
  }

  @Query(() => [Author], {
    name: 'authors',
    description: 'returns list of Author',
  })
  @TryAndCatch()
  findAll() {
    return this.authorService.findAll();
  }

  @Query(() => Author, {
    name: 'author',
    description: 'gets Author either by keys',
  })
  @TryAndCatch()
  findOne(
    @Args('getAuthor', { type: () => GetAuthorInput })
    getAuthor: GetAuthorInput,
  ) {
    return this.authorService.findOne(getAuthor);
  }

  @Mutation(() => Author, { name: 'updateAuthor' })
  @TryAndCatch()
  update(@Args('updateAuthorArgs') updateAuthor: UpdateAuthorArgs) {
    return this.authorService.update(updateAuthor);
  }

  @Mutation(() => Author, { name: 'removeAuthor' })
  @TryAndCatch()
  remove(
    @Args('getAuthor', { type: () => GetAuthorInput })
    getAuthor: GetAuthorInput,
  ) {
    return this.authorService.remove(getAuthor);
  }
}
