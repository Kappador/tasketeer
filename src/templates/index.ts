import needle from "needle";
import type { InitData, ResponseData, Template } from "../types/types";
import yaml from "js-yaml";

export default class {
  private template: Template;
  private init: InitData;

  constructor(data: InitData) {
    this.template = {} as Template;
    this.init = data;
  }

  static getTemplates() {
    const router = new Bun.FileSystemRouter({
      style: "nextjs",
      dir: "./src/templates/",
      fileExtensions: [".yaml"],
    });

    const routes = router.routes;
    const returnable = {} as { [key: string]: string };

    for (let route of Object.keys(routes)) {
      const parsedRoute = route.split(/\/(.*)/s)[1];
      const path =
        "/src/templates/" + routes[route].split("/src/templates/")[1];

      returnable[parsedRoute] = path;
    }

    return returnable;
  }

  setInitData(data: InitData) {
    this.init = data;
  }

  parseTemplate(template: string) {
    return new Promise(async (resolve, reject) => {
      const file = Bun.file(`src/templates/${template}.yaml`);
      let returnableTemplate = {} as Template;

      const doc: any = yaml.load(await file.text());

      if (doc && doc.template) {
        returnableTemplate.id = doc.template.id;
        returnableTemplate.requests = new Map();

        try {
          for (let variable of doc.template.variables) {
            const { key, type = "any", optional = false } = variable;

            const provided = this.init[key];

            if (provided === undefined) {
              if (optional) {
                this.init[key] = "";
                continue;
              }
              throw new Error(`Missing variable ${key}`);
            }

            if (type != "any" && typeof provided !== type) {
              throw new Error(`Invalid type for variable ${key}`);
            }
          }
        } catch (error) {
          reject(error);
        }

        doc.template.requests.forEach((request: any) => {
          let headers: any = {};
          if (request.options.headers) {
            for (let head of request.options.headers) {
              headers[head.key] = head.value;
            }
          }

          returnableTemplate.requests.set(request.id, {
            method: request.method,
            url: request.url,
            options: {
              ...request.options,
              json: true,
              headers,
            },
            body: request.body,
          });
        });
      }

      this.template = returnableTemplate;
      resolve(true);
    });
  }

  replaceVariables(responses: Map<string, ResponseData>, line: string) {
    try {
      const firstMatch = line.match(/(.*?){{(.*?)/);
      if (!firstMatch) {
        return {
          found: 0,
          result: line,
        };
      }
      const before = firstMatch[1];
      const dataPart = line.split(firstMatch[0])[1];

      const secondMatch = dataPart.match(/(.*?)}}(.*)/);
      if (!secondMatch) {
        return {
          found: 0,
          result: line,
        };
      }
      const evaluate = secondMatch[1];
      const after = secondMatch[2];

      let res;
      const req = evaluate.split(".")[0];
      if (req === "init") {
        res = this.init;
      } else {
        res = responses.get(req);
      }
      if (!res) throw new Error();

      const value = evaluate.split(".").slice(1).join(".");
      const result = eval("res." + value);

      return {
        found: 1,
        result: before + result + after,
      };
    } catch (error) {
      return {
        found: 0,
        result: line,
      };
    }
  }

  executeFlow(): Promise<Map<string, ResponseData>> {
    return new Promise(async (resolve) => {
      const responses = new Map<string, ResponseData>();

      for (let [key, request] of this.template.requests) {
        try {
          let result;
          if (request.method === "get" || request.method === "head") {
            result = await needle(request.method, request.url, request.options);
          } else {
            let body = request.body;
            if (request.body) {
              let place = this.replaceVariables(responses, request.body.data);
              while (place.found) {
                request.body.data = place.result;
                place = this.replaceVariables(responses, request.body.data);
              }
            }

            if (request.url) {
              let place = this.replaceVariables(responses, request.url);
              while (place.found) {
                request.url = place.result;
                place = this.replaceVariables(responses, request.url);
              }
            }

            if (request.options.headers) {
              let oldToNew: any = {};
              for (let key of Object.keys(request.options.headers)) {
                let copy = key;
                let place = this.replaceVariables(responses, key);
                while (place.found) {
                  key = place.result;
                  place = this.replaceVariables(responses, key);
                }
                oldToNew[copy] = key;
              }

              let newHeaders: any = {};

              for (let key of Object.keys(oldToNew)) {
                let newKey = oldToNew[key];
                let value = request.options.headers[key];

                if (value === undefined) continue;
                value = value.toString();

                let place = this.replaceVariables(responses, value);
                while (place.found) {
                  value = place.result;
                  place = this.replaceVariables(responses, value);
                }
                newHeaders[newKey] = value;
              }

              request.options.headers = newHeaders;
            }

            result = await needle(
              request.method,
              request.url,
              request.body ? body?.data : {},
              {
                ...request.options,
              }
            );
          }

          const now = Date.now();

          const data = {
            statusCode: result.statusCode,
            body: result.body,
            cookies: result.cookies,
            headers: result.headers,
            url: result.url,
            timestamp: now,
            request,
          } as ResponseData;

          responses.set(key, data);
        } catch (error) {
          responses.set(key, {
            statusCode: 0,
            body: error,
            cookies: [],
            headers: {},
            url: "",
            timestamp: Date.now(),
            request,
          } as ResponseData);
        }
      }

      resolve(responses);
    });
  }

  getTemplate() {
    return this.template;
  }
}
