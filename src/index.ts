#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './cli/commands/init.js';

const program = new Command();

program
  .name('agent-relay')
  .description('轻量级多 Agent 协作接力工具')
  .version('0.1.0');

program.addCommand(initCommand);

program.parse();
