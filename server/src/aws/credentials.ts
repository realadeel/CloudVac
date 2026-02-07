import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { parse } from 'ini';
import type { AWSProfile, ProfileInfo } from '../../../shared/types.js';

let cachedProfiles: AWSProfile[] | null = null;

export function loadProfiles(forceReload = false): AWSProfile[] {
  if (cachedProfiles && !forceReload) return cachedProfiles;

  const credPath = join(homedir(), '.aws', 'credentials');
  let raw: string;
  try {
    raw = readFileSync(credPath, 'utf-8');
  } catch {
    throw new Error(`Could not read ${credPath}`);
  }

  const parsed = parse(raw);
  const profiles: AWSProfile[] = [];

  for (const [name, section] of Object.entries(parsed)) {
    if (typeof section !== 'object' || !section) continue;
    const s = section as Record<string, string>;
    if (!s.aws_access_key_id || !s.aws_secret_access_key) continue;
    profiles.push({
      name,
      accessKeyId: s.aws_access_key_id,
      secretAccessKey: s.aws_secret_access_key,
      sessionToken: s.aws_session_token,
      region: s.region,
    });
  }

  cachedProfiles = profiles;
  return profiles;
}

export function getProfile(name: string): AWSProfile | undefined {
  return loadProfiles().find((p) => p.name === name);
}

export function getProfileInfoList(): ProfileInfo[] {
  return loadProfiles().map((p) => ({
    name: p.name,
    region: p.region ?? null,
  }));
}
