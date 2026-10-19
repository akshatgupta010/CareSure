import app from "./app.js";
import { config } from "./config/index.js";

export function startServer() {
  return app.listen(config.port, config.host, () => {
    console.log(
      `CareSure Backend Engine running at http://${config.host}:${config.port}`
    );
  });
}

startServer();
