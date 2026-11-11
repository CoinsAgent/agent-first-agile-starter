import { resetLocalIdentity } from '../backend/wallet-auth';
import { applicationDataTables, clearApplicationData } from '../backend/applications';

try {
  const values = new Map<string, string>();
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    if (!['--database', '--environment', '--confirm'].includes(args[i]) || !args[i + 1] || values.has(args[i])) throw new Error('Invalid or duplicate reset argument.');
    values.set(args[i], args[i + 1]);
  }
  const result = resetLocalIdentity({ databasePath: values.get('--database') ?? '', environment: values.get('--environment') ?? '', confirmation: values.get('--confirm') ?? '' }, clearApplicationData, applicationDataTables);
  console.log(JSON.stringify(result));
} catch {
  console.error('Reset refused or failed; no partial reset committed. Use --database /absolute/local/file.sqlite --environment development|test --confirm DELETE-LOCAL-USER-DATA. Inspect the target first; shared/production reset is not authorized.');
  process.exitCode = 1;
}
