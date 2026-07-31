import { Query, Resolver } from '@nestjs/graphql';

// Apollo (code-first) refuses to boot without at least one Query;
// this also doubles as a health check until real resources are generated.
@Resolver()
export class AppResolver {
  @Query(() => String, { description: 'Health check' })
  health(): string {
    return 'ok';
  }
}
