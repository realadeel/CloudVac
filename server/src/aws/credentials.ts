import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { parse } from 'ini';
import type { AWSProfile, ProfileInfo } from '../../../shared/types.js';

let cachedProfiles: AWSProfile[] | null = null;

export function loadProfiles(forceReload = false): AWSProfile[] {
  if (cachedProfiles && !forceReload) return cachedProfiles;

  const credPath = join(homedir(), '.aws', 'credentials');
  const configPath = join(homedir(), '.aws', 'config');
  const profiles: AWSProfile[] = [];
  const seen = new Set<string>();

  // Parse ~/.aws/credentials (has direct keys)
  if (existsSync(credPath)) {
    try {
      const raw = readFileSync(credPath, 'utf-8');
      const parsed = parse(raw);

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
        seen.add(name);
      }
    } catch {
      // credentials file unreadable — continue to config
    }
  }

  // Parse ~/.aws/config for extra region info and profiles with keys there
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, 'utf-8');
      const parsed = parse(raw);

      for (const [rawName, section] of Object.entries(parsed)) {
        if (typeof section !== 'object' || !section) continue;
        const s = section as Record<string, string>;
        // Config file uses "profile xxx" prefix (except [default])
        const name = rawName.replace(/^profile\s+/, '');

        if (seen.has(name)) {
          // Merge region from config into existing profile
          if (s.region) {
            const existing = profiles.find((p) => p.name === name);
            if (existing && !existing.region) {
              existing.region = s.region;
            }
          }
        } else if (s.aws_access_key_id && s.aws_secret_access_key) {
          // Some people put keys in config
          profiles.push({
            name,
            accessKeyId: s.aws_access_key_id,
            secretAccessKey: s.aws_secret_access_key,
            sessionToken: s.aws_session_token,
            region: s.region,
          });
          seen.add(name);
        }
      }
    } catch {
      // config file unreadable — skip
    }
  }

  if (profiles.length === 0) {
    throw new Error(`No AWS profiles found in ${credPath} or ${configPath}`);
  }

  cachedProfiles = profiles;
  return profiles;
}

export function getProfile(name: string): AWSProfile | undefined {
  return loadProfiles().find((p) => p.name === name);
}

export function getProfileInfoList(): ProfileInfo[] {
  // Always force reload to pick up new profiles
  return loadProfiles(true).map((p) => ({
    name: p.name,
    region: p.region ?? null,
  }));
}
