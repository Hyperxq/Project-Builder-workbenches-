import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { AbstractRepository } from '@app/common';
import { Author } from './entities/author.entity';

@Injectable()
export class AuthorRepository extends AbstractRepository<Author> {
  constructor(
    @InjectModel(Author.name) private readonly authorModel: Model<Author>,
    @InjectConnection() connection: Connection,
  ) {
    super(authorModel, connection);
  }
}
