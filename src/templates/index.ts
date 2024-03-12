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

  setInitData(data: InitData) {
    this.init = data;
  }

  parseTemplate(template: string) {
    return new Promise(async (resolve) => {
      const file = Bun.file(`src/templates/${template}.yaml`);
      let returnableTemplate = {} as Template;

      const doc: any = yaml.load(await file.text());

      if (doc && doc.template) {
        returnableTemplate.id = doc.template.id;
        returnableTemplate.requests = new Map();

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
      resolve(true)
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
        console.log("sending " + key);
        try {
          let result;
          if (
            request.options.method === "get" ||
            request.options.method === "head"
          ) {
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

        } catch (error) {}
      }

      resolve(responses);
    });
  }

  getTemplate() {
    return this.template;
  }
}
