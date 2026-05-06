#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');

const program = new Command();

program
  .name('agent-pet')
  .description('Desktop pet companion for Claude Code')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize agent-pet and configure global hooks')
  .action(async () => {
    const { init } = require('../src/commands/init');
    await init();
  });

program
  .command('start')
  .description('Start the desktop pet')
  .action(async () => {
    const { start } = require('../src/commands/start');
    await start();
  });

program
  .command('restart')
  .description('Restart the desktop pet')
  .action(async () => {
    const { restart } = require('../src/commands/restart');
    await restart();
  });

program.parse(process.argv);