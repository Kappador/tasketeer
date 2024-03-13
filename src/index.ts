import Server from "./api";
import Tasks from "./tasks";
import Templates from "./templates";

const server = new Server(3000);
const tasks = new Tasks(16);

server.loadRoutes();

server.add("/tasks/add", {
  post: (req) => {
    return new Promise(async (resolve) => {
      try {
        const body: any = await req.json();

        const id = await tasks.addTask(body);

        resolve(
          new Response(JSON.stringify({ message: "Task added", id }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          })
        );
      } catch (error) {
        resolve(
          new Response(
            JSON.stringify({
              error: "Internal server error",
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
        );
      }
    });
  },
});

server.add("/tasks/get", {
  post: (req) => {
    return new Promise(async (resolve) => {
      try {
        const body: any = await req.json();

        const id = body.id;
        const task = tasks.getTask(id);

        if (!task) {
          return resolve(
            new Response(JSON.stringify({ error: "Task not found" }), {
              status: 404,
              headers: {
                "Content-Type": "application/json",
              },
            })
          );
        }

        resolve(
          new Response(JSON.stringify({ message: "Task found", task }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          })
        );
      } catch (error) {
        resolve(
          new Response(
            JSON.stringify({
              error: "Internal server error",
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
        );
      }
    });
  },
});

server.add("/templates", {
  get: () => {
    return new Promise(async (resolve) => {
      const templates = Templates.getTemplates();

      resolve(
        new Response(JSON.stringify({ message: "Templates found", templates }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        })
      );
    });
  },
});

server.start();
