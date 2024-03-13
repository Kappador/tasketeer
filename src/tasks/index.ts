import { randomString } from "kappa-helper";
import { TaskStatus, type Task, type TaskInputData } from "../types/types";

export default class {
  private size: number;
  private running: number;
  private interval: Timer | null = null;

  private newTasks: string[] = [];
  private tasks: Map<string, Task> = new Map();

  constructor(size: number) {
    this.size = size;
    this.running = 0;
    this.runner();
  }

  start() {
    if (this.interval) {
      throw new Error("Runner already running");
    }

    this.runner();
  }

  stop() {
    if (!this.interval) {
      throw new Error("Runner not running");
    }

    clearInterval(this.interval);
  }

  runner() {
    const interval = setInterval(async () => {
      if (this.running < this.size && this.newTasks.length > 0) {
        const id = this.newTasks.shift();
        if (!id) {
          return;
        }
        const task = this.tasks.get(id);
        if (!task) {
          throw new Error("Task not found");
        }

        if (task.status === TaskStatus.PENDING) {
          task.status = TaskStatus.RUNNING;
          console.log("[TASK] Running task", task.id);

          task.lastStatusUpdate = new Date();

          task.worker = new Worker(
            new URL("./worker.ts", import.meta.url).href
          );
          task.worker.postMessage(
            JSON.stringify({
              id,
              task,
            })
          );

          task.worker.onmessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);

            console.log("[TASK] Task finished", data.id);

            task.status = data.status;
            task.message = data.message;
            task.data = data.data;

            task.worker?.terminate();
          };

          this.running++;
        }
      }
    }, 1000);

    this.interval = interval;
  }

  addTask(data: TaskInputData) {
    const id = randomString(8);
    
    const task = {
      id,
      status: TaskStatus.PENDING,
      templateId: data.templateId,
      message: "",
      data: data.data,
      lastStatusUpdate: new Date(),
      timeout: data.timeout,
      timeoutRetries: data.timeoutRetries,
    } as Task;

    this.tasks.set(id, task);
    this.timeoutTask(task);

    this.newTasks.push(id);

    return id;
  }

  getTask(id: string) {
    const task = this.tasks.get(id);
    if (!task) {
      return false
    }

    return task;
  }

  timeoutTask(task: Task) {
    setTimeout(() => {
      // self explanatory right?
      task.timeoutRetries++;

      // Removed old tasks
      if (
        task.status === "finished" ||
        task.status === "error"
      ) {
        if (task.lastStatusUpdate.getTime() + 20000 < Date.now()) {
          if (task.worker) {
            task.worker.terminate();
            this.running--;
          }
          this.tasks.delete(task.id);
        }
        
        this.timeoutTask(task);
        return;

      }

      if (
        task.status === "running" ||
        task.status === "pending"
      ) {
        if (task.worker) {
          // if the last status update is older than the timeout
          if (task.lastStatusUpdate.getTime() + task.timeout < Date.now()) {
            task.status = TaskStatus.ERROR;
            task.message = "Worker timeout";
            task.worker.terminate();
            this.running--;
            return;
          } else {
            if (task.timeoutRetries > 5) {
              task.status = TaskStatus.ERROR;
              task.message = "Timeout retries exceeded";
              return;
            }
            this.timeoutTask(task);
            return;
          }
        } else {
          if (task.timeoutRetries > 5) {
            task.status = TaskStatus.ERROR;
            task.message = "Worker not found & timeout retries exceeded";
            return;
          }
          this.timeoutTask(task);
          return;
        }
      }
    }, task.timeout);
  }
}
