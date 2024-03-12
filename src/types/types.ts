import {
  type NeedleOptions,
  type NeedleHttpVerbs,
} from "needle";

export enum TaskStatus {
  PENDING = "pending",
  RUNNING = "running",
  FINISHED = "finished",
  ERROR = "error",
}

export interface TaskInputData {
  templateId: string;
  data: any;
  timeout: number;
  timeoutRetries: number;
}

export interface Task {
  id: string;
  status: TaskStatus;
  templateId: string;
  message: string;
  data: any;
  lastStatusUpdate: Date;
  timeout: number;
  timeoutRetries: number;
  worker?: Worker;
}

export interface WorkerData {
  id: string;
  tasks: Map<string, Task>;
}

export interface InitData {
  [key: string]: any;
}

export interface ResponseData {
  statusCode: number;
  body: any;
  cookies: any;
  headers: any;
  url: string;
  timestamp: number;
  request: TemplateRequest;
}

export interface TemplateRequest {
  method: NeedleHttpVerbs;
  url: string;
  options: NeedleOptions;
  body?: {
    type: "json" | "form" | "string";
    data: any;
  };
}

export interface Template {
  id: string;
  requests: Map<string, TemplateRequest>;
}
