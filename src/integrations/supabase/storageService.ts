import { supabase } from './client';

const BUCKET_NAME = 'avatars';

/**
 * Faz o upload de um arquivo para o Supabase Storage.
 * @param file O arquivo a ser enviado.
 * @param path O caminho onde o arquivo será salvo no bucket.
 * @returns A URL pública do arquivo ou um erro.
 */
export async function uploadFile(file: File, path: string): Promise<{ publicUrl: string | null; error: any }> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Erro ao fazer upload do arquivo:', error);
    return { publicUrl: null, error };
  }

  // Obter a URL pública
  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return { publicUrl: publicUrlData.publicUrl, error: null };
}
