import Template from "./templates";

const temp = new Template({
  login:"admin",
});

await temp.parseTemplate("gql/UseLive")

const reses = await temp.executeFlow();
console.log(reses.get("req_1")?.body[0].data)