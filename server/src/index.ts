import { routePartykitRequest } from "partyserver";
import { Room } from "./room";

export { Room };

export type Env = {
  Room: DurableObjectNamespace<Room>;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      // cors:true はタイトル画面の「ゲームをリセット」ボタンがWebSocketを使わず
      // 直接POSTするための、プレーンなHTTPリクエスト用のCORS許可
      (await routePartykitRequest(request, env, { cors: true })) ??
      new Response("Not Found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
