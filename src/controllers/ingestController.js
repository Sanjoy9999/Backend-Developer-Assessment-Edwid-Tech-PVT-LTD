import { ingestQueue } from "../queues/ingestQueue.js";

const ingestNews = async (req, res, next) => {
  try {
    const { data } = req.body;

    // Add job to queue
    await ingestQueue.add("ingest-job", { data });

    res.status(202).json({
      message: "Ingestion job added to queue. Check server logs for progress.",
      note: "The process runs asynchronously via BullMQ.",
    });
  } catch (error) {
    next(error);
  }
};

export { ingestNews };
