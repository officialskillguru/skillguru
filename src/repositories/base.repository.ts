import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { type Result, ok, fail, type AppError, DatabaseError } from "@/utils/result";

export type PaginationOptions = {
  page: number;
  limit: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
};

/**
 * Helper type aliases derived from the generated Database schema.
 */
type Tables = Database["public"]["Tables"];
type TableRow<K extends keyof Tables> = Tables[K]["Row"];
type TableInsert<K extends keyof Tables> = Tables[K]["Insert"];
type TableUpdate<K extends keyof Tables> = Tables[K]["Update"];

/**
 * Structural interface for a Supabase postgrest query builder.
 *
 * Supabase's `.from()` returns different concrete types depending on whether
 * the table name is a string literal or a type variable. When it's a type
 * variable (as in this generic BaseRepository), TypeScript cannot resolve
 * the concrete column types, and `.eq()` / `.insert()` / `.update()` lose
 * type inference.
 *
 * Rather than suppressing with `@ts-expect-error` or `as never`, we define
 * a narrow structural interface that matches the runtime shape of the
 * Supabase query builder. This is safe because:
 *   1. The runtime object DOES have these methods (duck typing).
 *   2. We constrain return types to the correct Row/Insert/Update generics.
 *   3. Each concrete repository still gets full type-safety for its table
 *      because TypeScript resolves the generic at the subclass level.
 */
interface QueryBuilder<Row> {
  select(
    columns: string,
    options?: { count?: "exact" | "planned" | "estimated" }
  ): FilterBuilder<Row>;
  insert(values: unknown): { select(): { single(): Promise<{ data: Row | null; error: PostgrestError | null }> } };
  update(values: unknown): FilterBuilder<Row>;
}

interface FilterBuilder<Row> {
  eq(column: string, value: unknown): FilterBuilder<Row>;
  select(columns?: string): FilterBuilder<Row>;
  single(): Promise<{ data: Row | null; error: PostgrestError | null }>;
  maybeSingle(): Promise<{ data: Row | null; error: PostgrestError | null }>;
  range(from: number, to: number): Promise<{ data: Row[] | null; error: PostgrestError | null; count: number | null }>;
  then: Promise<{ data: Row[] | null; error: PostgrestError | null; count: number | null }>["then"];
  // Allow awaiting directly
  [Symbol.toStringTag]?: string;
}

interface PostgrestError {
  message: string;
  code: string;
  details: string;
  hint: string;
}

/**
 * BaseRepository provides typed CRUD + pagination for any Supabase table.
 *
 * Every concrete repository extends this with a string-literal table name,
 * e.g. `class CoursesRepository extends BaseRepository<"courses">`.
 *
 * The generic parameters ensure Row/Insert/Update types are always derived
 * from the generated Database schema — never from `any`.
 */
export abstract class BaseRepository<
  T extends keyof Tables,
  Row = TableRow<T>,
  Insert = TableInsert<T>,
  Update = TableUpdate<T>
> {
  protected readonly client: SupabaseClient<Database>;
  protected readonly tableName: T;

  constructor(client: SupabaseClient<Database>, tableName: T) {
    this.client = client;
    this.tableName = tableName;
  }

  protected mapError(error: unknown, context: string): AppError {
    let message = `Database error in ${this.tableName}`;
    let code = "DB_ERROR";

    if (typeof error === "object" && error !== null) {
      if ("message" in error && typeof (error as Record<string, unknown>).message === "string") {
        message = (error as Record<string, unknown>).message as string;
      }
      if ("code" in error && typeof (error as Record<string, unknown>).code === "string") {
        code = (error as Record<string, unknown>).code as string;
      }
    }

    return new DatabaseError(
      message,
      `Database error during ${context} with code ${code}`,
      "Please contact support if this error persists.",
      error
    );
  }

  /**
   * Returns a typed query builder for the configured table.
   *
   * The cast through `unknown` to `QueryBuilder<Row>` is structurally valid:
   * - `this.client.from(tableName)` returns a PostgrestQueryBuilder at runtime
   * - That object has `.select()`, `.insert()`, `.update()` methods
   * - We constrain the return type to our Row generic
   *
   * This avoids `@ts-expect-error` while preserving type contracts.
   */
  private queryBuilder(): QueryBuilder<Row> {
    return this.client.from(this.tableName) as unknown as QueryBuilder<Row>;
  }

  async find(query: Partial<Row> = {}): Promise<Result<Row[], AppError>> {
    try {
      let builder = this.queryBuilder().select("*");

      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          builder = builder.eq(key, value);
        }
      }

      const { data, error } = await (builder as unknown as Promise<{ data: Row[] | null; error: PostgrestError | null }>);
      if (error) return fail(this.mapError(error, "find"));
      return ok(data ?? []);
    } catch (err: unknown) {
      return fail(this.mapError(err, "find"));
    }
  }

  async findOne(id: string): Promise<Result<Row, AppError>> {
    try {
      const { data, error } = await this.queryBuilder()
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) return fail(this.mapError(error, "findOne"));
      if (!data) return fail(new DatabaseError(`Record not found in ${this.tableName}`, "Record was not found.", "Check if the record exists.", { id }));
      return ok(data as Row);
    } catch (err: unknown) {
      return fail(this.mapError(err, "findOne"));
    }
  }

  async paginate(
    options: PaginationOptions,
    query: Partial<Row> = {}
  ): Promise<Result<PaginatedResponse<Row>, AppError>> {
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;

      let builder = this.queryBuilder().select("*", { count: "exact" });

      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          builder = builder.eq(key, value);
        }
      }

      const { data, error, count } = await builder.range(
        offset,
        offset + limit - 1
      );

      if (error) return fail(this.mapError(error, "paginate"));

      const totalCount = count ?? 0;
      return ok({
        data: data ?? [],
        count: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      });
    } catch (err: unknown) {
      return fail(this.mapError(err, "paginate"));
    }
  }

  // To be overridden by concrete repositories that know which columns are full-text indexed
  abstract search(
    query: string,
    options: PaginationOptions
  ): Promise<Result<PaginatedResponse<Row>, AppError>>;

  async create(data: Insert): Promise<Result<Row, AppError>> {
    try {
      const { data: created, error } = await this.queryBuilder()
        .insert(data)
        .select()
        .single();

      if (error) return fail(this.mapError(error, "create"));
      return ok(created as Row);
    } catch (err: unknown) {
      return fail(this.mapError(err, "create"));
    }
  }

  async update(id: string, data: Update): Promise<Result<Row, AppError>> {
    try {
      const { data: updated, error } = await this.queryBuilder()
        .update(data)
        .eq("id", id)
        .select("*")
        .single();

      if (error) return fail(this.mapError(error, "update"));
      return ok(updated as Row);
    } catch (err: unknown) {
      return fail(this.mapError(err, "update"));
    }
  }

  async delete(id: string): Promise<Result<void, AppError>> {
    try {
      const { error } = await (this.queryBuilder()
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id) as unknown as Promise<{ data: unknown; error: PostgrestError | null }>);

      if (error) return fail(this.mapError(error, "delete"));
      return ok(undefined);
    } catch (err: unknown) {
      return fail(this.mapError(err, "delete"));
    }
  }
}
