const { EventEmitter } = require("node:events");
const { spawn } = require("child_process");
const fs = require("fs");

/** @type {MSCU} */
class MCSU extends EventEmitter {
  /**
   * @param {MSCUOptions} options
   */
  constructor(options = {}) {
    super();
    /** @type {MSCUOptions} */
    this.options = options;
    /** @type {MSCUOptions["mcPath"]} */
    this.mcPath = options.mcPath ?? null;
    /** @type {MSCUOptions["nogui"]} */
    this.nogui = options.nogui ?? true;
    /** @type {string[]} */
    this.flags = options.flags ?? [];
    /** @type {boolean} */
    this.running = false;
    /** @type {import("node:child_process").ChildProcessWithoutNullStreams | null} */
    this.spawn = null;
    /** @type {boolean} @private */
    this.pipe = options.pipe ?? false;

    if(options.startScript) {
      /** @readonly */
      this.usingScript = true;
      /** @readonly */
      this.scriptName = options.startScript;
    } else {
      this.usingScript = false;
      /** @readonly */
      this.jarName = options.serverJar;
    }

    if(options.autostart) this.startServer();

    process.stdin.on("data", (data) => {
      if(data.toString() == "stop") return this.restart = false;
    });

    if(!fs.existsSync(this.mcPath)) throw new Error(`${this.mcPath} does not exist or is not a valid path`);
  }

  startServer() {
    if(this.usingScript) {
      if(this.scriptName.endsWith(".sh")) {
        this.spawn = spawn("bash", [this.scriptName], {
          cwd: this.mcPath,
          stdio: "pipe"
        })
      } else {
        this.spawn = spawn("cmd.exe", ['/c', this.scriptName], {
          cwd: this.mcPath,
          stdio: "pipe"
        })
      }
    } else {
      this.spawn = spawn("java", [...this.flags, '-jar', this.jarName, this.nogui ? "nogui" : ""], {
        cwd: this.mcPath,
        stdio: "pipe"
      })
    }

    this.spawn.stdin.setEncoding("uft8");

    if(this.pipe) {
      process.stdin.pipe(this.spawn.stdin);
      this.spawn.stdout.pipe(process.stdout);
    }

    this.spawn.stdout.on("data", (data) => {
      const [info, message] = data.toString().split(":");
      const infoArr = info.split("] [");
      const timeStr = infoArr[0].substring(1);
      const time = new Date(timeStr);
      const type = infoArr[1].split("/")[1];

      if(message.includes("For help, type \"help\"")) this.emit("ready");
      this.emit("log", { type, time, from: infoArr[2] ?? "", message: message.trim() });
    });
  }

  runCommand(command) {
    if(this.spawn == null) return false;
    this.spawn.stdin.write(`${command}\n`);
    return true;
  }
}

module.exports = MCSU;

/**
 * @typedef MSCUOptions
 * @property {string | undefined} startScript The name of the script you are using to start mc if you are using one
 * @property {string | undefined} serverJar The name of the jar file for the server
 * @property {string[] | undefined} flags The server flags
 * @property {boolean | undefined} nogui Disable the gui ( this is true by default )
 * @property {boolean | undefined} pipe Pipe the console input and output to minecraft's input and output
 * @property {string} mcPath The absolute path to the minecraft folder
 * @property {boolean} restart Automatically restart the server
 * @property {boolean} autostart Automatically start the server on script load
 */