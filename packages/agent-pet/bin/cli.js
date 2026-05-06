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

program
  .command('stop')
  .description('Stop the desktop pet')
  .action(async () => {
    const { stop } = require('../src/commands/stop');
    await stop();
  });

program
  .command('skin')
  .description('Switch or list skins')
  .argument('[name]', 'Skin name to switch to')
  .action(async (name) => {
    const { skin } = require('../src/commands/skin');
    await skin(name);
  });

program
  .command('setting')
  .description('Open settings UI')
  .alias('settings')
  .action(async () => {
    const { setting } = require('../src/commands/setting');
    await setting();
  });

program
  .command('build')
  .description('Build and install pet-desktop')
  .action(async () => {
    const { build } = require('../src/commands/build');
    await build();
  });

program
  .command('install-skin')
  .description('Install a skin package')
  .argument('<path>', 'Path to skin package directory or zip')
  .action(async (skinPath) => {
    const { installSkin } = require('../src/commands/install-skin');
    await installSkin(skinPath);
  });

program.parse(process.argv);