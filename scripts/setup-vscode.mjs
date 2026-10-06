import { constants } from 'node:fs';
import { chmod, copyFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exampleEnvPath = path.join(projectRoot, '.env.example');
const localEnvPath = path.join(projectRoot, '.env');

try {
  await copyFile(exampleEnvPath, localEnvPath, constants.COPYFILE_EXCL);
  await chmod(localEnvPath, 0o600).catch(() => {});
  console.info('Created .env from .env.example.');
} catch (error) {
  if (error?.code !== 'EEXIST') {
    console.error('Could not create .env. Check the project folder permissions.');
    process.exit(1);
  }
  console.info('Keeping the existing .env file unchanged.');
}

console.info('Installing the locked Node.js dependencies...');
const install = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['ci', '--no-audit', '--no-fund'],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    windowsHide: true,
  },
);

if (install.error || install.status !== 0) {
  console.error('Dependency installation failed. Fix the npm error above, then run npm run setup:vscode again.');
  process.exit(install.status || 1);
}

console.info('');
console.info('Setup complete. Before starting RegisTrack:');
console.info('1. Open .env in VS Code and set SUPABASE_DATABASE_URL to your Supabase Session pooler URI (port 5432).');
console.info('2. Press F5 and choose “Run RegisTrack”, or run npm run dev in the terminal.');
console.info('The .env file is ignored by Git. Keep its connection string private.');
