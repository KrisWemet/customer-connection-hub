import { config as loadDotEnv } from "dotenv";
import fs from "fs";
import path from "path";

const envCandidates = [
  ".env.test.local",
  ".env.test",
  ".env.local",
  ".env",
];

export function loadTestEnv() {
  for (const filename of envCandidates) {
    const filepath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(filepath)) {
      loadDotEnv({ path: filepath, override: false });
    }
  }
}
