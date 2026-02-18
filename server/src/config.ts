import dotenv from "dotenv";
const parsed = dotenv.config().parsed ?? {};
// Merge parsed .env into process.env (dotenv v17 doesn't always do this)
Object.assign(process.env, parsed);
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z
    .string()
    .url()
    .default("https://jlkognkltdkzerzpcqpu.supabase.co"),
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),
  TESSIO_API_URL: z.string().url().optional(),
  TESSIO_SERVICE_KEY: z.string().startsWith("tsvc_").optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GENCO_API_URL: z.string().url().optional(),
  PORT: z.coerce.number().default(3002),
  APP_URL: z.string().url().default("http://localhost:3002"),
  FRONTEND_URL: z.string().url().default("http://localhost:5174"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export const env = envSchema.parse(process.env);
