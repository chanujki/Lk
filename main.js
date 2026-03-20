const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const axios = require('axios');
const gradient = require('gradient-string');

const config = require('./config.json'); // Direct JSON use

require('./utils.js');
const TelegramAdapter = require('./telegram-adapter.js');

// Data files
const chatGroupsFile = path.join(__dirname, 'chatGroups.json');
const messageCountFile = path.join(__dirname, 'messageCount.json');
const userDataFile = path.join(__dirname, 'userData.json');

// Initialize files if not exist
if (!fs.existsSync(messageCountFile)) fs.writeFileSync(messageCountFile, JSON.stringify({}), 'utf8');
if (!fs.existsSync(chatGroupsFile)) fs.writeFileSync(chatGroupsFile, JSON.stringify([]), 'utf8');
if (!fs.existsSync(userDataFile)) fs.writeFileSync(userDataFile, JSON.stringify({}), 'utf8');

let chatGroups = JSON.parse(fs.readFileSync(chatGroupsFile, 'utf8'));
let gbanList = [];

const bot = new TelegramBot(config.token, { polling: true });
const commands = [];
let adminOnlyMode = false;
const cooldowns = new Map();

// Fetch global ban list
async function fetchGbanList() {
    try {
        const response = await axios.get('https://raw.githubusercontent.com/samirxpikachuio/Gban/main/Gban.json');
        gbanList = response.data.map(user => user.ID);
    } catch {
        logger('⚠️ Error fetching gban list');
    }
}
fetchGbanList();
cron.schedule('*/5 * * * *', fetchGbanList);

// Load commands
fs.readdirSync('./scripts/cmds').forEach(file => {
    if (file.endsWith('.js')) {
        try {
            const command = require(./scripts/cmds/${file});
            if (typeof command.config.role === 'undefined') command.config.role = 0;
            if (typeof command.config.cooldown === 'undefined') command.config.cooldown = 0;
            commands.push({ ...command, config: { ...command.config, name: command.config.name.toLowerCase() } });
            registerCommand(bot, command);
        } catch (error) {
            console.error(gradient.passion(❌ Error loading ${file}: ${error.message}));
        }
    }
});

function registerCommand(bot, command) {
    const usePrefix = command.config.usePrefix !== false;
    const prefixPattern = usePrefix ? ^${config.prefix}${command.config.name}\\b(.*)$ : ^${command.config.name}\\b(.*)$;
    bot.onText(new RegExp(prefixPattern, 'i'), (msg, match) => {
        executeCommand(bot, command, msg, match);
    });
        }
