import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "docs", "legal");

export async function readLegal(name: "TERMS" | "PRIVACY" | "REFUND"): Promise<string> {
  const file = path.join(ROOT, `${name}.md`);
  return readFile(file, "utf-8");
}
