import type { Server } from "bun";

export default class {
  private port: number;
  private routes: Map<
    string,
    {
      methods: {
        [method: string]: (req: Request) => Promise<Response>;
      };
    }
  > = new Map();
  private server: Server | null = null;

  constructor(port: number) {
    this.port = port;
  }

  fetch(req: Request): Promise<Response> {
    return new Promise(async (resolve, reject) => {
      const path = new URL(req.url).pathname;

      const route = this.routes.get(path);
      if (!route)
        return reject(
          new Response(
            JSON.stringify({
              error: "Route not found",
            }),
            {
              status: 404,
            }
          )
        );

      const handler = route.methods[req.method.toLowerCase()];
      if (!handler)
        return reject(
          new Response(
            JSON.stringify({
              error: "Method not allowed",
            }),
            {
              status: 405,
            }
          )
        );
      try {
        resolve(handler(req));
      } catch (error) {
        reject(
          new Response(
            JSON.stringify({
              error: "Internal server error",
            }),
            {
              status: 500,
            }
          )
        );
      }
    });
  }

  start() {
    if (!this.server)
      this.server = Bun.serve({
        fetch: this.fetch.bind(this),
        port: this.port,
      });
    else throw new Error("Server is already running");
  }

  stop() {
    if (this.server)
      this.server = Bun.serve({
        fetch: this.fetch.bind(this),
        port: 3000,
      });
    else throw new Error("Server is not running");
  }

  add(
    path: string,
    methods: { [method: string]: (req: Request) => Promise<Response> }
  ) {
    this.routes.set(path, { methods });
  }

  async loadRoutes(dir: string = "./src/api/routes") {
    const router = new Bun.FileSystemRouter({
      style: "nextjs",
      dir,
    });

    const routes = router.routes;

    for (const route of Object.values(routes)) {
      const methods = (await import(route)).default;
      const apiPath = route.split("api/routes")[1].split(".")[0];
      for (const method in methods) {
        if (apiPath === "/index") this.add("/", { [method]: methods[method] });
        else this.add(apiPath, { [method]: methods[method] });
      }
    }
  }
}
