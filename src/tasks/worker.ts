import { TaskStatus } from "../types/types";

declare var self: Worker;

self.onmessage = async (event: MessageEvent) => {
  const {id, task} = JSON.parse(event.data);

  // do stuff in the future
  // using the templating engine

  postMessage(
    JSON.stringify({
      id: id,
      status: TaskStatus.FINISHED,
      message: "Task finished",
      data: task.data,
    })
  );
};
