import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {fileURLToPath} from 'url';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadTestEnv(): dotenv.DotenvParseOutput {
  return dotenv.parse(fs.readFileSync(path.join(__dirname, '../../.testing.env'), 'utf-8'));
}
