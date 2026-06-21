import { createClient } from '@supabase/supabase-js';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class {};
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const bucketName = process.env.SUPABASE_BUCKET || 'biblioteca';

const supabase = createClient(supabaseUrl, supabaseKey);

export const subirArchivo = async (fileBuffer, originalName, mimeType) => {
  const extension = originalName.split('.').pop();
  const nombreUnico = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${extension}`;
  const rutaCompleta = `archivos/${nombreUnico}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(rutaCompleta, fileBuffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Error al subir a Supabase: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(rutaCompleta);

  return urlData.publicUrl;
};

export const eliminarArchivo = async (fileUrl) => {
  try {
    const partesUrl = fileUrl.split(`/storage/v1/object/public/${bucketName}/`);
    if (partesUrl.length < 2) return;
    
    const rutaCompleta = partesUrl[1];
    await supabase.storage.from(bucketName).remove([rutaCompleta]);
  } catch (err) {
    console.error('Error al intentar eliminar archivo físico de Supabase:', err.message);
  }
};
