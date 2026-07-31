import { Logger } from '@nestjs/common';

// Required by resolvers generated with @pbuilder/nestjs (crud-graphql-mongo),
// whose templates import TryAndCatch from @app/common but the schematic
// does not emit it.
export function TryAndCatch(): MethodDecorator {
  return (_target, propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;

    descriptor.value = async function (...args: unknown[]) {
      try {
        return await (originalMethod.apply(this, args) as Promise<unknown>);
      } catch (error) {
        Logger.error(error, String(propertyKey));
        throw error;
      }
    };

    return descriptor;
  };
}
