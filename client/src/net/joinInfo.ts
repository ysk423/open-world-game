export type JoinInfo = {
  name: string;
};

/** 全員が同じ拠点を共有するため、ルームIDは固定 */
export const SHARED_ROOM_ID = "main";

let current: JoinInfo | null = null;

/** 参加画面のフォーム送信時に一度だけ呼ばれる */
export function setJoinInfo(info: JoinInfo): void {
  current = info;
}

/** GameSceneの起動時に読み出す。参加画面を通らずにゲームは起動しないため必ず設定済み */
export function getJoinInfo(): JoinInfo {
  if (!current) {
    throw new Error("参加情報が設定される前にゲームが起動しました");
  }
  return current;
}
