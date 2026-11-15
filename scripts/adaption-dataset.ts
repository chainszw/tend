/**
 * Prepares the care-guidance dataset with Adaption Adaptive Data.
 *
 *   npm run adaption:dataset            upload, adapt, wait, save the evaluation
 *   npm run adaption:dataset -- status  check a run that is already in progress
 *
 * Flow (docs.adaptionlabs.ai): initiate upload → PUT file → complete upload →
 * wait for import → estimate → adapt → wait → read evaluation.
 * The result is saved to data/adaption-eval.json and shown in the app.
 */
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://api.prod.adaptionlabs.ai/api/v1";
const DATASET_NAME = "tend-eldercare-guidance";
const DATASET_FILE = path.join(process.cwd(), "data", "eldercare-guidance.jsonl");
const RESULT_FILE = path.join(process.cwd(), "data", "adaption-eval.json");
const POLL_MS = 10_000;
const MAX_WAIT_MS = 60 * 60_000;

interface SavedResult {
  datasetName: string;
  datasetId?: string;
  rows: number;
  status: string;
  gradeBefore: string | null;
  gradeAfter: string | null;
  scoreBefore: number | null;
  scoreAfter: number | null;
  improvementPercent: number | null;
  evaluatedAt: string | null;
}

interface StatusResponse {
  status: string;
  row_count: number | null;
  progress?: { percent?: number } | null;
  error_data?: { message?: string } | null;
}

interface EvaluationResponse {
  status: string;
  quality: {
    grade_before: string | null;
    grade_after: string | null;
    score_before: number | null;
    score_after: number | null;
    improvement_percent: number | null;
  } | null;
}

const apiKey = process.env.ADAPTION_API_KEY;
if (!apiKey) {
  console.error("ADAPTION_API_KEY is not set in .env.local");
  process.exit(1);
}

async function api<T>(method: string, route: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${route} failed with ${response.status}: ${text.slice(0, 500)}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function readResult(): Promise<SavedResult> {
  return JSON.parse(await readFile(RESULT_FILE, "utf8")) as SavedResult;
}

async function saveResult(patch: Partial<SavedResult>): Promise<SavedResult> {
  const next = { ...(await readResult()), ...patch };
  await writeFile(RESULT_FILE, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

/** The object key is the path of the pre-signed URL when the API does not return it. */
function keyFromUploadUrl(uploadUrl: string): string {
  return decodeURIComponent(new URL(uploadUrl).pathname.replace(/^\//, ""));
}

async function upload(): Promise<string> {
  const file = await readFile(DATASET_FILE);
  const { size } = await stat(DATASET_FILE);
  const rows = file.toString("utf8").trim().split("\n").length;

  const initiated = await api<{ upload_url: string; s3_key?: string }>(
    "POST",
    "/datasets/upload/initiate",
    { name: DATASET_NAME, file_format: "jsonl" },
  );
  console.log("Upload initiated. Response fields:", Object.keys(initiated).join(", "));

  const put = await fetch(initiated.upload_url, { method: "PUT", body: file });
  if (!put.ok) throw new Error(`File upload failed with ${put.status}: ${await put.text()}`);

  const completed = await api<{ dataset_id: string; status: string }>(
    "POST",
    "/datasets/upload/complete",
    {
      s3_key: initiated.s3_key ?? keyFromUploadUrl(initiated.upload_url),
      name: DATASET_NAME,
      file_format: "jsonl",
      file_size_bytes: size,
    },
  );
  console.log(`Uploaded ${rows} rows as dataset ${completed.dataset_id} (${completed.status}).`);
  await saveResult({ datasetId: completed.dataset_id, rows, status: "uploaded" });
  return completed.dataset_id;
}

async function waitFor(
  datasetId: string,
  label: string,
  done: (status: StatusResponse) => boolean,
): Promise<StatusResponse> {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const status = await api<StatusResponse>("GET", `/datasets/${datasetId}/status`);
    if (status.status === "failed") {
      throw new Error(`${label} failed: ${status.error_data?.message ?? "no details"}`);
    }
    if (done(status)) return status;
    console.log(`${label}: ${status.status} ${status.progress?.percent ?? 0}%`);
    await wait(POLL_MS);
  }
  throw new Error(`${label} did not finish within an hour. Run "status" later.`);
}

async function adapt(datasetId: string): Promise<void> {
  await waitFor(datasetId, "Import", (status) => status.row_count !== null);

  const request = {
    training_type: "instruction_dataset",
    column_mapping: { prompt: "prompt", completion: "completion" },
    recipe_specification: { recipes: { prompt_rephrase: true, deduplication: true } },
  };
  const estimate = await api<{ estimatedCreditsConsumed: number; estimatedMinutes: number }>(
    "POST",
    `/datasets/${datasetId}/adapt`,
    { ...request, estimate: true },
  );
  console.log(
    `Estimate: ${estimate.estimatedCreditsConsumed} credits, about ${estimate.estimatedMinutes} minutes.`,
  );

  const run = await api<{ run_id: string }>("POST", `/datasets/${datasetId}/adapt`, request);
  console.log(`Adapt run started: ${run.run_id}`);
  await saveResult({ status: "adapting" });
}

async function finish(datasetId: string): Promise<void> {
  const status = await waitFor(datasetId, "Adapt", (s) => s.status === "succeeded");
  const evaluation = await api<EvaluationResponse>("GET", `/datasets/${datasetId}/evaluation`);
  const quality = evaluation.quality;
  const saved = await saveResult({
    rows: status.row_count ?? undefined,
    status: quality ? "evaluated" : `adapted (evaluation ${evaluation.status})`,
    gradeBefore: quality?.grade_before ?? null,
    gradeAfter: quality?.grade_after ?? null,
    scoreBefore: quality?.score_before ?? null,
    scoreAfter: quality?.score_after ?? null,
    improvementPercent: quality?.improvement_percent ?? null,
    evaluatedAt: quality ? new Date().toISOString() : null,
  });
  console.log("Saved to data/adaption-eval.json:", saved);
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "run";
  if (command === "status") {
    const { datasetId } = await readResult();
    if (!datasetId) throw new Error('No dataset yet. Run "npm run adaption:dataset" first.');
    await finish(datasetId);
    return;
  }
  const datasetId = await upload();
  await adapt(datasetId);
  await finish(datasetId);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
