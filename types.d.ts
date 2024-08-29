import type { ChildProcessWithoutNullStreams } from "child_process"
import { EventEmitter } from "events";
export type Awaitable<T> = T | PromiseLike<T>;

interface Events {
  "ready": [];
  "join": [username: string];
  "leave": [username: string];
  "message": [author: string, message: string];
  "log": [type: string, time: Date, from: string, message: string]
}

interface properties {
  "allow-flight": boolean;
  "allow-nether": boolean;
  "broadcast-console-to-ops": boolean;
  "broadcast-rcon-to-ops": boolean;
  debug: boolean;
  difficulty: "peaceful" | "easy" | "normal" | "hard";
  "enable-command-block": boolean;
}

export interface MSCUOptions {
  startScript?: string;
  serverJar?: string;
  flags?: string[];
  nogui?: boolean;
  mcPath: string;
  restart: boolean;
  autostart: boolean;
}

export class MCSU extends EventEmitter {
  constructor(options: MSCUOptions);
  public readonly usingScript: boolean;
  public readonly scriptName?: string;
  public readonly jarName?: string;
  public options: MSCUOptions;
  public mcPath: MSCUOptions["mcPath"];
  public nogui: MSCUOptions["nogui"];
  public flags: string[];
  public running: boolean;
  public spawn: ChildProcessWithoutNullStreams?;

  public on<K extends keyof Events>(
    event: K,
    listener: (...args: Events[K]) => Awaitable<void>
  ): this;
  public once<K extends keyof Events>(
    event: K,
    listener: (...args: Events[K]) => Awaitable<void>
  ): this;
  public off<K extends keyof Events>(
    event: K,
    listener: (...args: Events[K]) => Awaitable<void>
  ): this;
}