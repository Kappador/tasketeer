import Tasks from "./tasks";
import type { TaskInputData } from "./types/types";

const x = new Tasks(8);

const id = x.addTask({
  templateId: "1",
  message: "Hello World",
  data: "data XD",
  timeout: 10000,
  timeoutRetries: 3,
} as TaskInputData);

console.log("Task added", id);

setInterval(() => {
  const gett = x.getTask(id);
  if (!gett) {
    return console.log("Task not found");
  }

  console.log("Task", {
    id: gett.id,
    status: gett.status,
    message: gett.message,
    data: gett.data,
  });
}, 5000);
