import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export function loadTestEnv(): dotenv.DotenvParseOutput {
  return dotenv.parse(fs.readFileSync(path.join(__dirname, '../../.testing.env'), 'utf-8'));
}
