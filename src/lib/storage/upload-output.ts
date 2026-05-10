/**
 * 변환 산출물 → Supabase Storage 업로드 helper
 *
 * 워커(scripts/cli-worker.ts)는 자체 supabase-js 클라이언트를 직접 사용 (env 격리).
 * 이 모듈은 본 사이트 서버 코드에서 (review 재생성, 재업로드 시) 동일 경로 규약으로
 * 업로드할 때 사용한다.
 *
 * 경로 규약 (마이그레이션 0004 와 일치):
 *   media-output/{channel_slug}/{pair_id}/output.mp4    (private)
 *   thumbnails/{channel_slug}/{pair_id}/thumbnail.jpg   (public)
 */
import "server-only";
import fs from "node:fs/promises";
import { createAdminClient } from "@/lib/supabase/server";

export type UploadOutputArgs = {
  pairId: string;
  channelSlug: string;
  videoPath: string;
  thumbnailPath: string;
};

export type UploadOutputResult = {
  videoStoragePath: string;
  thumbnailStoragePath: string;
};

export async function uploadOutput(
  args: UploadOutputArgs,
): Promise<UploadOutputResult> {
  const { pairId, channelSlug, videoPath, thumbnailPath } = args;
  const admin = createAdminClient();

  const videoRemote = `${channelSlug}/${pairId}/output.mp4`;
  const thumbRemote = `${channelSlug}/${pairId}/thumbnail.jpg`;

  const videoBuf = await fs.readFile(videoPath);
  const { error: ve } = await admin.storage
    .from("media-output")
    .upload(videoRemote, videoBuf, {
      contentType: "video/mp4",
      upsert: true,
    });
  if (ve) throw new Error(`media-output upload: ${ve.message}`);

  const thumbBuf = await fs.readFile(thumbnailPath);
  const { error: te } = await admin.storage
    .from("thumbnails")
    .upload(thumbRemote, thumbBuf, {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (te) throw new Error(`thumbnails upload: ${te.message}`);

  return {
    videoStoragePath: `media-output/${videoRemote}`,
    thumbnailStoragePath: `thumbnails/${thumbRemote}`,
  };
}
