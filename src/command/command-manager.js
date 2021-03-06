const path = require('path');
const fs = require('fs');

const Command = require('./command');
const CommandData = require('../network/type/command-data');
const CommandParameter = require('../network/type/command-parameter');
const Player = require('../player');
const ConsoleSender = require('./console-sender');
const logger = require('../utils/logger');

class CommandManager {

    /** @type {Set<Command>} */
    #commands = new Set()

    constructor() {
        // Register vanilla commands
        const vanilla = fs.readdirSync(path.join(__dirname, 'vanilla'));
        vanilla.forEach((id) => {
            if (id.includes('.test.') || !id.includes('.js'))
                return;  // Exclude test files

            const command = require(`./vanilla/${id}`);
            this.registerClassCommand(new command());
        });

        // Register jsprismarine commands
        const jsprismarine = fs.readdirSync(path.join(__dirname, 'jsprismarine'));
        jsprismarine.forEach((id) => {
            if (id.includes('.test.') || !id.includes('.js'))
                return;  // Exclude test files

            const command = require(`./jsprismarine/${id}`);
            this.registerClassCommand(new command());
        });

        logger.debug(`Registered §b${vanilla.length + jsprismarine.length}§r commands(s)!`);
    }

    /**
     * Registers a command into the command manager.
     * 
     * @param {string} name 
     * @param {string} description 
     * @param {function(ConsoleSender|Player)} execute 
     */
    registerCommand(name = '', description = '', execute = function (sender) { }) {
        let command = new Command({ name, description });

        let parameter = new CommandParameter();
        parameter.name = 'args';
        parameter.type = 0x100000 | 0x22;  // TODO: hardcoded values
        parameter.optional = true;
        command.parameters.add(parameter);

        command.execute = execute;

        this.#commands.add(command);
    }

    /**
     * Register a command into command manager by class.
     * 
     * @param {Command} command 
     */
    registerClassCommand(command) {
        let parameter = new CommandParameter();
        parameter.name = 'args';
        parameter.type = 0x100000 | 0x22;  // TODO: hardcoded values
        parameter.optional = true;
        command.parameters.add(parameter);
        this.#commands.add(command);
        logger.silly(`Command with id §b${command.namespace}:${command.name}§r registered`);
    }

    /**
     * Dispatches a command and executes them.
     * 
     * @param {Player|ConsoleSender} sender 
     * @param {string} commandInput 
     */
    dispatchCommand(sender, commandInput = '') {
        if (!(commandInput.startsWith('/'))) {
            logger.warn('Received an invalid command!');
        }

        logger.info(`§b${sender.name}§r issued server command: §b${commandInput}§r!`);

        let commandParts = commandInput.split(' ');  // Name + arguments array
        let commandNamespace = commandParts[0].includes(':') ? commandParts[0].split(':')[0] : '';
        let commandName = commandParts[0].replace(`${commandNamespace}:`, ''); //Ignore namespace for now
        let commandNameIndex = commandParts.indexOf(commandName);
        commandParts.splice(commandNameIndex, 1);

        // Check for numbers and convert them
        for (let argument of commandParts) {
            if (!isNaN(argument) && argument.trim().length != 0) { // command argument parsing fixed
                let argumentIndex = commandParts.indexOf(argument);
                commandParts[argumentIndex] = Number(argument);
            }
        }

        for (let command of this.#commands) {
            if (command.name === commandName.substr(1)) {
                return command.execute(sender, commandParts, commandName);
            }
        }

        if (sender instanceof Player) {
            return sender.sendMessage('§cCannot find the desired command!');
        } else {
            return logger.warn('Cannot find the desired command!');
        }
    }

    get commands() {
        return this.#commands;
    }
}
module.exports = CommandManager;
