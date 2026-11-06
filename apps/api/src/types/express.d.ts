// Express 5 makes `req.query` read-only, so `validate()` cannot replace it with the parsed value.
// It stores the parsed body, query and params here instead; narrow them with the schema's output type.
declare global {
  namespace Express {
    interface Request {
      validated?: { body?: unknown; query?: unknown; params?: unknown }
    }
  }
}

export {}
