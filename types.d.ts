import type { ChildProcessWithoutNullStreams } from "child_process"

export interface MSCUOptions {
  startScript?: string;
  serverJar?: string;
  flags?: string[];
  nogui?: boolean;
  mcPath: string;
  restart: boolean;
  autostart: boolean;
}

export interface MCSU {
  readonly usingScript: boolean;
  readonly scriptName?: string;
  readonly jarName?: string
  options: MSCUOptions;
  mcPath: MSCUOptions["mcPath"];
  nogui: MSCUOptions["nogui"];
  flags: string[];
  running: boolean;
  spawn: ChildProcessWithoutNullStreams?;
}