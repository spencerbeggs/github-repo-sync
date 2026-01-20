import { Octokit } from '@octokit/rest';
import sodium from 'tweetsodium';

interface SyncConfig {
  owner: string;
  repos: string[];
  secrets: string[];
  settings: Record<string, unknown>;
  rulesets: RulesetConfig[];
  dryRun: boolean;
}

interface RulesetConfig {
  name: string;
  target: 'branch' | 'tag';
  enforcement: 'active' | 'disabled' | 'evaluate';
  conditions: {
    ref_name: {
      include: string[];
      exclude: string[];
    };
  };
  rules: Array<{ type: string; parameters?: Record<string, unknown> }>;
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function encryptSecret(publicKey: string, secretValue: string): Promise<string> {
  const messageBytes = Buffer.from(secretValue);
  const keyBytes = Buffer.from(publicKey, 'base64');
  const encryptedBytes = sodium.seal(messageBytes, keyBytes);
  return Buffer.from(encryptedBytes).toString('base64');
}

async function syncSecrets(owner: string, repo: string, secrets: string[], dryRun: boolean) {
  console.log(`  📦 Syncing secrets...`);
  
  // Get repo public key for encryption
  const { data: publicKey } = await octokit.actions.getRepoPublicKey({ owner, repo });
  
  for (const secretName of secrets) {
    const secretValue = process.env[secretName];
    if (!secretValue) {
      console.log(`    ⚠️  ${secretName}: not found in .env, skipping`);
      continue;
    }
    
    if (dryRun) {
      console.log(`    🔐 ${secretName}: would update`);
      continue;
    }
    
    const encryptedValue = await encryptSecret(publicKey.key, secretValue);
    
    await octokit.actions.createOrUpdateRepoSecret({
      owner,
      repo,
      secret_name: secretName,
      encrypted_value: encryptedValue,
      key_id: publicKey.key_id,
    });
    
    console.log(`    ✅ ${secretName}: updated`);
  }
}

async function syncSettings(owner: string, repo: string, settings: Record<string, unknown>, dryRun: boolean) {
  console.log(`  ⚙️  Syncing settings...`);
  
  if (dryRun) {
    console.log(`    Would update:`, Object.keys(settings).join(', '));
    return;
  }
  
  await octokit.repos.update({
    owner,
    repo,
    ...settings,
  });
  
  console.log(`    ✅ Settings updated`);
}

async function syncRulesets(owner: string, repo: string, rulesets: RulesetConfig[], dryRun: boolean) {
  console.log(`  📋 Syncing rulesets...`);
  
  // Get existing rulesets
  const { data: existingRulesets } = await octokit.repos.getRepoRulesets({
    owner,
    repo,
  });
  
  for (const ruleset of rulesets) {
    const existing = existingRulesets.find((r) => r.name === ruleset.name);
    
    if (dryRun) {
      console.log(`    📜 ${ruleset.name}: would ${existing ? 'update' : 'create'}`);
      continue;
    }
    
    const rulesetPayload = {
      owner,
      repo,
      name: ruleset.name,
      target: ruleset.target,
      enforcement: ruleset.enforcement,
      conditions: ruleset.conditions,
      rules: ruleset.rules,
    };
    
    if (existing) {
      await octokit.repos.updateRepoRuleset({
        ...rulesetPayload,
        ruleset_id: existing.id,
      });
      console.log(`    ✅ ${ruleset.name}: updated`);
    } else {
      await octokit.repos.createRepoRuleset(rulesetPayload);
      console.log(`    ✅ ${ruleset.name}: created`);
    }
  }
}

export async function syncRepos(config: SyncConfig) {
  const { owner, repos, secrets, settings, rulesets, dryRun } = config;
  
  if (dryRun) {
    console.log('🔍 DRY RUN - no changes will be made\n');
  }
  
  for (const repo of repos) {
    console.log(`\n🔄 Syncing ${owner}/${repo}`);
    
    try {
      if (secrets?.length) {
        await syncSecrets(owner, repo, secrets, dryRun);
      }
      
      if (settings && Object.keys(settings).length) {
        await syncSettings(owner, repo, settings, dryRun);
      }
      
      if (rulesets?.length) {
        await syncRulesets(owner, repo, rulesets, dryRun);
      }
      
      console.log(`✅ ${owner}/${repo} synced successfully`);
    } catch (error) {
      console.error(`❌ Error syncing ${owner}/${repo}:`, error);
    }
  }
  
  console.log('\n🎉 Sync complete!');
}
