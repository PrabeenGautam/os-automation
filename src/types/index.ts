export interface Workflow {
  name?: string;
  on?: unknown; // event triggers can be many shapes
  jobs: Record<string, Job>;
}

export interface Job {
  name?: string;
  "runs-on"?: string | string[];
  strategy?: Strategy;
  steps: Step[];
}

export interface JobWithStrategy extends Job {
  strategy: Strategy;
}

export interface Strategy {
  matrix?: Matrix;
  [key: string]: unknown;
}

export interface Matrix {
  os?: string[] | string;
  include?: Array<Record<string, string | number>>;
  [key: string]: unknown;
}

export interface Step {
  name?: string;
  run?: string;
  uses?: string;
  with?: Record<string, string>;
  if?: string;
  shell?: string;
}
