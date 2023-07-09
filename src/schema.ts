import { deepMerge, z } from '../deps.ts';

// Define the options for the Dongoose function
interface DongooseOptions<T> {
  db: Deno.Kv;
  name: string;
  indexes?: Array<keyof T>;
  timestamps?: boolean;
}

// Helper function to generate a collection name
const getCollectionName = (name: string, index: string) => `${name}_by_${index}`;

// Helper function to update timestamps in the data
const updateTimestamps = (data: Record<string, unknown>, isInsertion: boolean) => {
  const now = Date.now();
  if (isInsertion) {
    data.createdAt = now;
  }
  data.updatedAt = now;
};

// Helper function to perform a transaction on the database
const performTransaction = (
  db: Deno.Kv,
  key: string,
  indexes: Array<string>,
  data: Record<string, unknown>,
  operation: 'set' | 'delete',
) => {
  updateTimestamps(data, operation === 'set');
  const transaction = db.atomic();
  for (const index of indexes) {
    const collectionName = getCollectionName(key, index);
    transaction[operation]([collectionName, (data[index] as string).toString()], data);
  }
  return transaction.commit();
};

// Main Dongoose function
export const Dongoose = <T extends z.ZodRawShape>(schema: T, { db, name, indexes }: DongooseOptions<T>) => {
  const schemaName = name;
  const schemaIndexes = [...new Set([...indexes || [], 'id'])] as const;

  // Define the various schema validation objects
  const schemaValidationObject = z.object(schema);
  const schemaValidationObjectWithId = schemaValidationObject.extend({
    id: z.string().uuid(),
  });
  const schemaValidationFullObject = schemaValidationObjectWithId.extend({
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
  });
  const schemaValidationPartialObject = schemaValidationObject.partial();
  const schemaValidationPartialObjectWithId = schemaValidationObjectWithId.extend({
    id: z.string().uuid(),
  }).partial();

  // Define the various schema types
  type SchemaObject = z.infer<typeof schemaValidationObject>;
  type SchemaFullObject = z.infer<typeof schemaValidationFullObject>;
  type SchemaObjectWithId = z.infer<typeof schemaValidationObjectWithId>;
  type SchemaPartialObject = z.infer<typeof schemaValidationPartialObject>;
  type SchemaPartialObjectWithId = z.infer<typeof schemaValidationPartialObjectWithId>;

  // Define the various CRUD operations
  const create = (data: SchemaObject) => {
    schemaValidationObject.parse(data);
    const id = crypto.randomUUID();
    return performTransaction(db, schemaName, schemaIndexes as Array<string>, { id, ...data }, 'set');
  };

  const findOne = async (query: SchemaPartialObjectWithId) => {
    schemaValidationPartialObjectWithId.parse(query);
    if (Object.keys(query).length === 0) {
      return null;
    }
    const results = await db.getMany<Array<SchemaFullObject>>(
      Object.entries(query).map<[string, string]>(([key, value]) => [getCollectionName(schemaName, key), value]),
    );
    return (results.find((result) => result.value)?.value as SchemaFullObject) ?? null;
  };

  // @ts-expect-error - generic type do not know that it has an id
  const findById = (id: string) => findOne({ id });

  const updateById = async (id: string, data: SchemaPartialObject) => {
    schemaValidationPartialObject.parse(data);
    // @ts-expect-error - generic type do not know that it has an id
    const item = await findOne({ id });
    if (!item) {
      return null;
    }
    const newData = deepMerge<SchemaFullObject>(item, data);
    return performTransaction(db, schemaName, schemaIndexes as Array<string>, newData, 'set');
  };

  const updateOne = async (query: SchemaPartialObjectWithId, data: SchemaPartialObject) => {
    schemaValidationPartialObject.parse(data);
    const item = await findOne(query);
    if (!item) {
      return null;
    }
    // @ts-expect-error - generic type do not know that it has an id
    return updateById(item.id, data);
  };

  const deleteById = async (id: string) => {
    // @ts-expect-error - generic type do not know that it has an id
    const item = await findOne({ id });
    if (!item) {
      return null;
    }
    return performTransaction(db, name, schemaIndexes as Array<string>, item, 'delete');
  };

  const deleteOne = async (query: SchemaPartialObjectWithId) => {
    const item = await findOne(query);
    if (!item) {
      return null;
    }
    return performTransaction(db, name, schemaIndexes as Array<string>, item, 'delete');
  };

  return {
    create,
    findOne,
    findById,
    updateOne,
    updateById,
    deleteOne,
    deleteById,
  };
};

// Define a set of common schema types for convenience
export const d = {
  string: z.string,
  number: z.number,
  boolean: z.boolean,
  bigint: z.bigint,
  date: z.date,
  array: z.array,
  object: z.object,
  tuple: z.tuple,
  enum: z.enum,
};
