/** Estado del pipeline para la GUI (se guarda en output/pipeline_status.json). */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, "..", "..", "output", "pipeline_status.json");

export interface StatusPipeline {
  estado: "idle" | "corriendo" | "listo" | "error";
  inicio?: string;
  fin?: string;
  error?: string;
}

export async function escribirStatus(s: StatusPipeline): Promise<void> {
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(s), "utf-8");
}

export async function leerStatus(): Promise<StatusPipeline> {
  try {
    return JSON.parse(await readFile(FILE, "utf-8"));
  } catch {
    return { estado: "idle" };
  }
}
