import { Queue, Worker } from "bullmq";
import { processIngestion } from "../workers/ingestWorker.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Parse Redis URL for BullMQ connection
const redisUrl = new URL(REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port),
};

const QUEUE_NAME = "ingest-news";

// Create Queue
const ingestQueue = new Queue(QUEUE_NAME, { connection });

// Create Worker
const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(`[Queue] Processing job ${job.id}...`);
    const { data } = job.data;
    await processIngestion(data);
    console.log(`[Queue] Job ${job.id} completed.`);
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`[Queue] Job ${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.error(`[Queue] Job ${job.id} has failed with ${err.message}`);
});

export { ingestQueue };
