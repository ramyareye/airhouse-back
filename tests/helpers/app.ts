import { workerApp } from "../../src/worker/index";
import type { Env } from "../../src/types/env";
import { buildTestEnv } from "./env";

export function requestWorker(path: string, init?: RequestInit, envOverrides: Partial<Env> = {}) {
  return workerApp.request(`http://localhost${path}`, init, buildTestEnv(envOverrides));
}
