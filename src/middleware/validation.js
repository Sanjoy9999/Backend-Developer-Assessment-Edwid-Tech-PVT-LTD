import Joi from "joi";

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        details: error.details.map((detail) => detail.message),
      });
    }
    next();
  };
};

const schemas = {
  ingest: Joi.object({
    data: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().required(),
          content: Joi.string().required(),
          source: Joi.string().optional(),
        })
      )
      .optional(),
  }),
  chat: Joi.object({
    query: Joi.string().required(),
    session_id: Joi.string().required(),
    sessionId: Joi.string().optional(), // Allow sessionId as alias if needed, but prefer session_id
  }).xor("session_id", "sessionId"), // Require one of them
};

export { validateRequest, schemas };
