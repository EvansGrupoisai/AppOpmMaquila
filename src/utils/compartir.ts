import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';

// La captura sale del árbol de vistas, no de la pantalla: se toma solo la sección
// pedida y a su tamaño completo, aunque no quepa en el alto del teléfono.
//
// Para compartir se abre la hoja nativa del sistema en vez de enlazar directo a
// WhatsApp: el esquema whatsapp:// no admite adjuntar imágenes, solo texto. La
// hoja sí manda la imagen y además deja elegir Telegram, correo o guardar.

/** "Camarón Oscar" + "2026-08-19" + "Indicadores clave" -> "Camaron_Oscar_2026-08-19_Indicadores_clave" */
export function nombreArchivo(unidad: string, fecha: string, seccion: string): string {
  return (unidad + '_' + fecha + '_' + seccion)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 90);
}

export class ErrorCaptura extends Error {}

export async function capturarYCompartir(
  referencia: any,
  nombre: string,
  titulo: string
): Promise<void> {
  if (!referencia) {
    throw new ErrorCaptura('No se pudo ubicar la sección en pantalla.');
  }

  let uri: string;
  try {
    uri = await captureRef(referencia, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      fileName: nombre,
    });
  } catch {
    throw new ErrorCaptura('No se pudo generar la imagen de la sección.');
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new ErrorCaptura('Este dispositivo no tiene con qué compartir archivos.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle: titulo,
  });
}

/**
 * Guarda un PDF que llegó en base64 y abre la hoja de compartir. En web no hay hoja
 * nativa: se descarga el archivo.
 *
 * Va a Documentos y no a la caché para que el sistema no lo borre mientras la app
 * destino todavía lo está leyendo.
 *
 * Ojo con las imágenes de los reportes: en iPhone, la extensión de WhatsApp del menú
 * de compartir tiene poca memoria y se cierra sin avisar si el PDF trae una imagen
 * enorme (pasó con logo_buencast.png a 10417 px): el mensaje nunca aparece en el chat.
 */
export async function compartirPdf(base64: string, nombre: string, titulo: string): Promise<void> {
  const archivo = nombre + '.pdf';

  // "%PDF-" en base64. Si el servidor mandó otra cosa, mejor avisar que compartir basura.
  if (!base64 || !base64.startsWith('JVBER')) {
    throw new ErrorCaptura('El servidor no regresó un PDF válido.');
  }

  if (Platform.OS === 'web') {
    const enlace = document.createElement('a');
    enlace.href = 'data:application/pdf;base64,' + base64;
    enlace.download = archivo;
    enlace.click();
    return;
  }

  let uri: string;
  try {
    const carpeta = new Directory(Paths.document, 'compartidos');
    carpeta.create({ intermediates: true, idempotent: true });
    const f = new File(carpeta, archivo);
    f.create({ overwrite: true });
    f.write(base64, { encoding: 'base64' });
    if (!f.exists || !f.size) throw new Error('vacío');
    uri = f.uri;
  } catch {
    throw new ErrorCaptura('No se pudo guardar el PDF en el teléfono.');
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new ErrorCaptura('Este dispositivo no tiene con qué compartir archivos.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: titulo,
  });
}

/**
 * Da tiempo a que React pinte los cambios de estado (abrir la sección y mostrar el
 * encabezado de marca) antes de fotografiar el árbol de vistas.
 */
export function esperarPintado(ms = 180): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}
