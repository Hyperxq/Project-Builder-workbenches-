import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthorResolver } from './author.resolver';
import { AuthorService } from './author.service';
import { Author } from './entities/author.entity';
import { AuthorSchema } from './schemas/author.schema';
import { AuthorRepository } from './author.repository';

@Module({
  providers: [AuthorResolver, AuthorService, AuthorRepository],
  imports: [
    DatabaseModule,
    MongooseModule.forFeature([
      {
        name: Author.name,
        schema: AuthorSchema,
        collection: 'authors',
      },
    ]),
  ],
})
export class AuthorsModule {}
