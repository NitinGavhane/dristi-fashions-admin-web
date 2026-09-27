/**
 * One-command deploy of the Admin website to AWS.
 *
 *   npm run deploy
 *
 * It ships the production build to the SAME S3 + CloudFront pair the Flutter
 * admin web build used (dristi-admin-app/deploy-web.sh), so the admin URL does
 * not change:
 *
 *   1. vite build                                    -> dist/
 *   2. aws s3 sync dist/ s3://<bucket> --delete       (replaces the old build)
 *   3. aws cloudfront create-invalidation "/*"        (so admins get it at once)
 *
 * The distribution already maps 403/404 -> /index.html with a 200, which is
 * what this SPA's pushState routes need; nothing about the distribution has to
 * change to swap Flutter for React.
 *
 * Credentials come from your local `aws` CLI config — nothing secret is
 * committed. You need the AWS CLI working for account 078525505229 (ap-south-1).
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ---- AWS resources (not secret; safe to commit) -------------------------- */
const REGION = 'ap-south-1';
const BUCKET = 'dristi-admin-web-078525505229';
const DIST_ID = 'E3BVP4DZHKPN5L';
const SITE = 'https://d30ai0wvr18s47.cloudfront.net';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

/* The AWS CLI is not always on PATH in Git Bash; allow an override, else fall
 * back to the default Windows install path, else trust PATH. */
function resolveAws() {
  if (process.env.AWS_CLI) return process.env.AWS_CLI;
  const win = 'C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe';
  return existsSync(win) ? win : 'aws';
}
const AWS = resolveAws();

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', ...opts });
}
function step(msg) {
  console.log(`\n\u2192 ${msg}`);
}

function main() {
  step('Checking AWS credentials');
  try {
    const who = JSON.parse(run(AWS, ['sts', 'get-caller-identity', '--output', 'json']));
    console.log(`  account ${who.Account} as ${who.Arn.split('/').pop()}`);
  } catch {
    console.error(
      '  ERROR: the AWS CLI is not configured. Run `aws configure` (account 078525505229) or set AWS_CLI to its path.',
    );
    process.exit(1);
  }

  step('Building (vite build)');
  run('npm', ['run', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' });

  // A build that produced no index.html would sync an empty tree over the live
  // site, so refuse before `--delete` can do any damage.
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('  ERROR: dist/index.html is missing — refusing to sync.');
    process.exit(1);
  }

  step(`Uploading to s3://${BUCKET}`);
  run(AWS, ['s3', 'sync', DIST, `s3://${BUCKET}`, '--delete', '--only-show-errors', '--region', REGION], {
    stdio: 'inherit',
  });

  step('Invalidating the CloudFront cache');
  const status = run(AWS, [
    'cloudfront', 'create-invalidation',
    '--distribution-id', DIST_ID,
    '--paths', '/*',
    '--query', 'Invalidation.Status',
    '--output', 'text',
  ]).trim();
  console.log(`  invalidation ${status}`);

  console.log(`\n\u2705 Live at ${SITE} (cache clears in ~1-2 min)`);
}

main();
