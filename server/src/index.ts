import { routePartykitRequest } from "partyserver";
import { Room } from "./room";

export { Room };

export type Env = {
  Room: DurableObjectNamespace<Room>;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ??
      new Response("Not Found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
