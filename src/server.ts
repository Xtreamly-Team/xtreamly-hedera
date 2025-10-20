import express from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import helmet from "helmet";
import { v4 as uuidv4 } from "uuid";
import { config } from "dotenv";
import { SignalNFTApp } from "./nft_signal_app.js";
import { ContractApp } from "./contract_app.js";

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
  if (!(process.env.NODE_ENV === "production")) {
    next()
    return req
  }
  const apiKey = req.headers["x-api-key"];
  if (apiKey && apiKey === process.env.XTREAMLY_USER_MANAGEMENT_API_KEY) {
    next();
    return req
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

app.post("/setup", apiKeyMiddleware, async (req, res) => {
  const contractApp = new ContractApp()
  try {
    console.info("Run post signal")
    await contractApp.userFirstTimeSetup()
    res.json({ "status": "success", "message": `Setup successful for ${process.env.HEDERA_ACCOUNT_ID}` });
    contractApp.close()
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    contractApp.close()
  }
});

app.post("/trade", apiKeyMiddleware, async (req, res) => {
  const contractApp = new ContractApp()
  try {
    console.info("Running post signal")
    console.info(`Request body: ${JSON.stringify(req.body)}`)

    const { usdc, weth } = req.body

    const usdcAmount = parseFloat(usdc)
    const wethAmount = parseFloat(weth)

    console.log(`Auto trading with USDC amount: ${usdcAmount}, WETH amount: ${wethAmount}`)

    const txId = await contractApp.autoTrade(usdcAmount, wethAmount)
    res.json({ "status": "success", "message": `Auto trade with ${usdcAmount} USDC and ${wethAmount} WETH successful. txId: ${txId}` });
    contractApp.close()
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    contractApp.close()
  }
});

app.post("/signal", apiKeyMiddleware, async (req, res) => {
  const nftApp = new SignalNFTApp()
  try {
    console.info("Running signal")
    const txId = await nftApp.fetchAndUpdateSignalNFT(
      'ETH',
    )
    res.json({ "status": "success", "message": `Signal sent to Hedera successfully. txId: ${txId}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    nftApp.close()
  }
});

app.post("/signal-manual", apiKeyMiddleware, async (req, res) => {
  const nftApp = new SignalNFTApp()
  try {
    console.info("Running signal manual")
    const { token, action, timestamp } = req.body
    console.log(`Request to update signal with token: ${token}, action: ${action}, timestamp: ${timestamp}`)
    const txId = await nftApp.updateSignalNFT(
      token,
      action,
      timestamp,
    )
    res.json({ "status": "success", "message": `Signal sent to Hedera successfully: ${txId}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    nftApp.close()
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
