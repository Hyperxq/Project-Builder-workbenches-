import {
  Connection,
  Model,
  QueryFilter,
  QueryOptions,
  SaveOptions,
  UpdateQuery,
} from 'mongoose';

// Define the base structure for repository response types.
type QueryResponse<T> = T | null;

// GraphQL input DTOs arrive as class instances whose declared-but-unset fields
// are own properties set to undefined (ES2022+ class fields); mongoose 9 no
// longer strips undefined from filters — it matches them as null.
const omitUndefined = <T extends object>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as T;

// Define a type for projection and query options.
interface FindOptions<T> extends QueryOptions<T> {
  projection?: Partial<Record<keyof T, 1 | 0>>;
}

// Abstract repository class with improved type safety.
export abstract class AbstractRepository<TDocument> {
  protected constructor(
    protected readonly model: Model<TDocument>,
    private readonly connection: Connection,
  ) {}

  /**
   * Create a new document.
   * @param document - The document to be created.
   * @param options - Additional save options.
   */
  async create<TCreate = TDocument, TResponse = TDocument>(
    document: TCreate,
    options?: SaveOptions,
  ): Promise<TResponse> {
    const createdDocument = new this.model<TCreate>(document);
    return (await createdDocument.save(options)) as TResponse;
  }

  /**
   * Find a single document by filter.
   * @param filterQuery - The filter query to find the document.
   * @param options - Additional query options.
   */
  async findOne<TProjection = TDocument>(
    filterQuery: QueryFilter<TDocument>,
    options?: FindOptions<TDocument>,
  ): Promise<QueryResponse<TProjection>> {
    const { projection, ...queryOptions } = options || {};
    return this.model.findOne(omitUndefined(filterQuery), projection, {
      lean: true,
      ...queryOptions,
    });
  }

  /**
   * Find multiple documents by filter.
   * @param filterQuery - The filter query to find documents.
   * @param options - Additional query options and projections.
   */
  async findMany<TProjection = TDocument>(
    filterQuery: QueryFilter<TDocument> = {},
    options?: FindOptions<TDocument>,
  ): Promise<TProjection[]> {
    const { projection, ...queryOptions } = options || {};
    return this.model.find(omitUndefined(filterQuery), projection, {
      lean: true,
      ...queryOptions,
    });
  }

  /**
   * Update a single document based on a filter query.
   * @param filterQuery - The filter to identify the document.
   * @param document - The document to update.
   * @param options - Additional query options.
   */
  async update<TUpdate = Partial<TDocument>, TResponse = TDocument>(
    filterQuery: QueryFilter<TDocument>,
    document: TUpdate,
    options: QueryOptions<TDocument> = {},
  ): Promise<QueryResponse<TResponse>> {
    const defaultOptions = {
      lean: true,
      upsert: false,
      returnDocument: 'after' as const,
    };

    return this.model.findOneAndUpdate(
      omitUndefined(filterQuery),
      omitUndefined(document as UpdateQuery<TDocument>),
      {
        ...defaultOptions,
        ...options,
      },
    ) as unknown as Promise<QueryResponse<TResponse>>;
  }

  /**
   * Remove a single document by filter query.
   * @param filterQuery - The filter query to identify the document to remove.
   */
  async remove<TResponse = TDocument>(
    filterQuery: QueryFilter<TDocument>,
  ): Promise<TResponse | null> {
    // Using type assertion to specify the type explicitly
    const deletedDocument = (await this.model.findOneAndDelete(
      omitUndefined(filterQuery),
      {
        lean: true,
      },
    )) as unknown as TResponse | null;
    return deletedDocument;
  }
}
