import express from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import helmet from "helmet";
import { v4 as uuidv4 } from "uuid";
import { sendSignalToHedera } from "./oracle.js";
import { config } from "dotenv";

config()

const app = express();
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  const request_id = uuidv4();
  console.log(`start request request_id='${request_id}' method='${req.method}' path='${req.url}'`);
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`end request request_id='${request_id}' status_code='${res.statusCode}' duration='${duration}ms'`);
  });

  next();
});

const port = parseInt(process.env.PORT || "3000", 10);

const apiKeyMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const apiKey = req.headers["x-api-key"];
  if (!(process.env.NODE_ENV === "production")) {
    next()
  }
  if (apiKey && apiKey === process.env.XTREAMLY_USER_MANAGEMENT_API_KEY) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

app.post("/post-signal", apiKeyMiddleware, async (req, res) => {
  try {
    console.info("Run post signal")
    const strategyRes = await sendSignalToHedera('ETH');
    res.json(strategyRes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/health", (req, res) => {
  res
    .status(200)
    .json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Swagger definition
// const swaggerSpec = swaggerJSDoc({
//   definition: {
//     openapi: "3.0.0",
//     info: {
//       title: "Xtreamly Hedera signal sender",
//       version: "1.0.0",
//       description: "API that sends Xtreamly trading signal to Hedera blockchain",
//     },
//     servers: [
//       // {
//       //   url: "",
//       //   description: "Production server",
//       // },
//       {
//         url: "http://localhost:3000",
//         description: "Local development server",
//       },
//     ],
//   },
//   apis: [__filename],
// });
//
// app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ error: "Internal Server Error" });
  } else {
    res.status(500).json({ error: err.message });
  }
});


app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at port ${port}`);
});
