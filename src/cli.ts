#!/usr/bin/env node
import { program } from 'commander';
import { config } from 'dotenv';
import { syncRepos } from './sync.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

config();

program
  .name('github-repo-sync')
  .description('Sync GitHub repo settings, secrets, and rulesets')
  .version('0.1.0');

program
  .command('sync')
  .description('Sync all repos with config')
  .option('-c, --config <path>', 'Path to config file', 'config.json')
  .option('-d, --dry-run', 'Show what would be changed without making changes')
  .option('-r, --repo <name>', 'Sync only a specific repo')
  .action(async (options) => {
    const configPath = resolve(process.cwd(), options.config);
    const configData = JSON.parse(readFileSync(configPath, 'utf-8'));
    
    const repos = options.repo 
      ? [options.repo] 
      : configData.repos;

    await syncRepos({
      ...configData,
      repos,
      dryRun: options.dryRun ?? false,
    });
  });

program
  .command('list')
  .description('List repos that would be synced')
  .option('-c, --config <path>', 'Path to config file', 'config.json')
  .action((options) => {
    const configPath = resolve(process.cwd(), options.config);
    const configData = JSON.parse(readFileSync(configPath, 'utf-8'));
    console.log('Repos to sync:');
    configData.repos.forEach((repo: string) => console.log(`  - ${configData.owner}/${repo}`));
  });

program.parse();
