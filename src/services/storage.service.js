import { createClient } from '@supabase/supabase-js';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class {};
}

const rawUrl = process.env.SUPABASE_URL;
const supabaseUrl = rawUrl && rawUrl.startsWith('http') ? rawUrl : 'https://placeholder-project.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY && process.env.SUPABASE_KEY !== 'tu_supabase_anon_key' ? process.env.SUPABASE_KEY : 'placeholder-key';
const bucketName = process.env.SUPABASE_BUCKET || 'biblioteca';

const supabase = createClient(supabaseUrl, supabaseKey);

export const subirArchivo = async (fileBuffer, originalName, mimeType) => {
  if (process.env.MOCK_STORAGE === 'true' || supabaseUrl.includes('placeholder-project')) {
    console.log(`[Mock Storage] Subiendo archivo ficticio: ${originalName}`);
    return `https://mock-supabase.co/storage/v1/object/public/${bucketName}/archivos/mock-${originalName}`;
  }

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
  if (process.env.MOCK_STORAGE === 'true' || supabaseUrl.includes('placeholder-project')) {
    console.log(`[Mock Storage] Archivo eliminado: ${fileUrl}`);
    return;
  }

  try {
    const partesUrl = fileUrl.split(`/storage/v1/object/public/${bucketName}/`);
    if (partesUrl.length < 2) return;
    
    const rutaCompleta = partesUrl[1];
    await supabase.storage.from(bucketName).remove([rutaCompleta]);
  } catch (err) {
    console.error('Error al intentar eliminar archivo físico de Supabase:', err.message);
  }
};
