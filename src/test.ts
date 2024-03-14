import Templates from "./templates";
const template = new Templates({
  login: "Lurxx",
});
await template.parseTemplate("gql/UseLive");

const reses = await template.executeFlow();

console.log(reses);
