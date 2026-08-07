import "dotenv/config";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const env = {
  dbHost: requiredEnv("DB_HOST"),
  dbUser: requiredEnv("DB_USER"),
  dbPassword: requiredEnv("DB_PASSWORD"),
  dbName: requiredEnv("DB_NAME"),
};