import postgres from "postgres";

let databaseClient;

export function getDatabase() {
  if (databaseClient) return databaseClient;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for database-backed routes");
  }

  databaseClient = postgres(connectionString, {
    max: Number(process.env.DATABASE_MAX_CONNECTIONS) || 5,
    idle_timeout: 20,
    connect_timeout: 10,
    transform: postgres.camel,
  });

  return databaseClient;
}

export async function closeDatabase() {
  if (!databaseClient) return;
  await databaseClient.end({ timeout: 5 });
  databaseClient = undefined;
}
