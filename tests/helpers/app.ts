import { workerApp } from "../../src/worker/index";
import { buildTestEnv } from "./env";

export function requestWorker(path: string, init?: RequestInit) {
  return workerApp.request(`http://localhost${path}`, init, buildTestEnv());
}
