const { EventEmitter } = require("node:events");
const { spawn } = require("child_process");
const fs = require("fs");

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
    /** @type {boolean} @readonly */
    this.ready = false;
    /** @type {number | undefined} @readonly */
    this.pid = undefined;

    this.regex = {
      leave: /^(.*)\sleft\sthe\sgame$/,
      join: /^(.*)\sjoined\sthe\sgame$/,
    }

    /** @type {Map<string, Date | "now">} @readonly */
    this.lastOnline = new Map();
    /** @type {string[]} @readonly */
    this.online = [];

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
        });
      } else {
        this.spawn = spawn("cmd.exe", ['/c', this.scriptName], {
          cwd: this.mcPath,
          stdio: "pipe"
        });
      }
    } else {
      this.spawn = spawn("java", [...this.flags, '-jar', this.jarName, this.nogui ? "nogui" : ""], {
        cwd: this.mcPath,
        stdio: "pipe"
      });
    }

    this.spawn.stdin.setEncoding("utf8");

    if(this.pipe) {
      process.stdin.pipe(this.spawn.stdin);
      this.spawn.stdout.pipe(process.stdout);
    }

    this.pid = this.spawn.pid;
    this.spawn.stdout.on("data", this.ondata);
    this.spawn.once("close", () => {
      this.spawn.removeAllListeners();
      this.spawn.stdin.removeAllListeners();
      this.spawn.stdout.removeAllListeners();
      this.ready = false;
      if(this.restart) this.startServer();
    });
  }

  ondata(data) {
    data = data.toString();
    const logRegex = /^\[(\w{0,}\s\d{2}:\d{2}:\d{2}.\d{3})]\s\[(.*)\/(INFO|WARN|ERROR|FATAL)]\s\[(.*)\/]:\s(.*)$/;
    if(!logRegex.test(data)) return;
    const [log, time, thread, type, from, message] = logRegex.exec(data);

    if(message.includes("For help, type \"help\"")) {
      this.ready = true;
      this.emit("ready");
    }
    if(this.regex.join.test(message)) {
      const username = message.split(" ")[0];
      this.lastOnline.set(username, "now");
      this.online.push(username);

      this.emit("join", username);
    }
    if(this.regex.leave.test(message)) {
      const username = message.split(" ")[0];
      this.lastOnline.set(username, new Date());
      if(this.online.indexOf(username) >= 0) this.online.splice(this.online.indexOf(username))

      this.emit("leave", username);
    }
    if(message.startsWith("<")) {
      let lastInd = message.indexOf(">");
      let author = message.slice(1, lastInd);
      let msg = message.slice(lastInd).trim();
      this.emit("message", author, msg);
    }
    this.emit("raw", log)
    this.emit("log", { time: new Date(time), thread, type, from, message: message.trim() });
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
 * @property {string[] | undefined} [flags = []] The server flags
 * @property {boolean | undefined} [nogui = true] Disable the gui ( this is true by default )
 * @property {boolean | undefined} [pipe = false] Pipe the console input and output to minecraft's input and output
 * @property {string} mcPath The absolute path to the minecraft folder
 * @property {boolean} restart Automatically restart the server
 * @property {boolean} autostart Automatically start the server on script load
 */