import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const [cwd, command] of [[root, 'npm run build'], [`${root}storefront`, 'npm run build']]) {
  const result = spawnSync(command, { cwd, shell: true, stdio: 'inherit', env: { ...process.env, ENSO_SHOWCASE: '1' } });
  if (result.status !== 0) process.exit(result.status || 1);
}
