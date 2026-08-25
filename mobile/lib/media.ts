import { VISIT_MEDIA_BUCKET, visitMediaPath, type PhotoKind } from "@vgrm/shared";
import { supabase } from "./supabase";

async function uploadFile(path: string, uri: string, contentType: string) {
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from(VISIT_MEDIA_BUCKET)
    .upload(path, arrayBuffer, { contentType, upsert: true });

  if (error) throw error;
  return path;
}

export async function uploadVisitPhoto(
  visitId: string,
  kind: PhotoKind,
  localUri: string,
  userId: string
) {
  const fileName = `${kind}-${Date.now()}.jpg`;
  const path = visitMediaPath(visitId, fileName);
  await uploadFile(path, localUri, "image/jpeg");

  const { error } = await supabase.from("visit_photos").insert({
    visit_id: visitId,
    kind,
    storage_path: path,
    created_by: userId,
  });
  if (error) throw error;
}

export async function uploadVisitSignature(
  visitId: string,
  localUri: string,
  signerName: string,
  signerDocument: string | null
) {
  const fileName = `assinatura-${Date.now()}.png`;
  const path = visitMediaPath(visitId, fileName);
  await uploadFile(path, localUri, "image/png");

  const { error } = await supabase.from("visit_signatures").insert({
    visit_id: visitId,
    storage_path: path,
    signer_name: signerName,
    signer_document: signerDocument,
  });
  if (error) throw error;
}

export async function signedUrl(path: string) {
  const { data } = await supabase.storage
    .from(VISIT_MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
