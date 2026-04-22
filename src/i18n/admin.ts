import { z } from "zod";

/**
 * Admin dictionary — ES only for F1.
 * The admin surface (/admin/*) is hidden from public navigation and search.
 * Keys are kept separate from the public site dict (es.ts/en.ts) so that
 * `i18n:check` only enforces parity for user-facing pages.
 * When F2 adds an EN admin surface, mirror this file as `admin-en.ts`.
 */
export const AdminDictSchema = z.object({
  "page.title": z.string(),
  "page.heading": z.string(),
  "page.subheading": z.string(),
  "page.refreshedAt": z.string(),
  "banner.degraded": z.string(),

  "runs.heading": z.string(),
  "runs.caption": z.string(),
  "runs.col.source": z.string(),
  "runs.col.started": z.string(),
  "runs.col.finished": z.string(),
  "runs.col.duration": z.string(),
  "runs.col.found": z.string(),
  "runs.col.new": z.string(),
  "runs.col.updated": z.string(),
  "runs.col.errored": z.string(),
  "runs.row.empty": z.string(),
  "runs.status.inProgress": z.string(),

  "errors.heading": z.string(),
  "errors.caption": z.string(),
  "errors.col.source": z.string(),
  "errors.col.type": z.string(),
  "errors.col.url": z.string(),
  "errors.col.message": z.string(),
  "errors.col.when": z.string(),
  "errors.row.empty": z.string(),
  "errors.bucket.http": z.string(),
  "errors.bucket.parse": z.string(),
  "errors.bucket.privacy": z.string(),
  "errors.bucket.other": z.string(),

  "sources.heading": z.string(),
  "sources.caption": z.string(),
  "sources.col.slug": z.string(),
  "sources.col.display": z.string(),
  "sources.col.enabled": z.string(),
  "sources.col.lastRun": z.string(),
  "sources.col.successRate": z.string(),
  "sources.col.actions": z.string(),
  "sources.enabled.yes": z.string(),
  "sources.enabled.no": z.string(),
  "sources.btn.enable": z.string(),
  "sources.btn.disable": z.string(),
  "sources.btn.tooltip": z.string(),
});

export type AdminDict = z.infer<typeof AdminDictSchema>;

export const adminEs: AdminDict = AdminDictSchema.parse({
  "page.title": "Scraping — Admin | Jinba",
  "page.heading": "Scraping — Admin",
  "page.subheading": "Telemetría interna del scraper (solo lectura, F1).",
  "page.refreshedAt": "Actualizado {when}",
  "banner.degraded": "Supabase no disponible — mostrando datos parciales.",

  "runs.heading": "Runs recientes",
  "runs.caption": "Últimas 20 ejecuciones del scraper",
  "runs.col.source": "Fuente",
  "runs.col.started": "Inicio",
  "runs.col.finished": "Fin",
  "runs.col.duration": "Duración",
  "runs.col.found": "Encontrados",
  "runs.col.new": "Nuevos",
  "runs.col.updated": "Actualizados",
  "runs.col.errored": "Errores",
  "runs.row.empty": "Sin datos",
  "runs.status.inProgress": "En curso",

  "errors.heading": "Errores recientes",
  "errors.caption": "Últimos 20 errores registrados",
  "errors.col.source": "Fuente",
  "errors.col.type": "Tipo",
  "errors.col.url": "URL",
  "errors.col.message": "Mensaje",
  "errors.col.when": "Cuándo",
  "errors.row.empty": "Sin errores recientes",
  "errors.bucket.http": "HTTP",
  "errors.bucket.parse": "Parse",
  "errors.bucket.privacy": "Privacidad",
  "errors.bucket.other": "Otro",

  "sources.heading": "Fuentes",
  "sources.caption": "Salud por fuente (últimos 10 runs)",
  "sources.col.slug": "Slug",
  "sources.col.display": "Nombre",
  "sources.col.enabled": "Activo",
  "sources.col.lastRun": "Último run",
  "sources.col.successRate": "Éxito últimos 10",
  "sources.col.actions": "Acciones",
  "sources.enabled.yes": "Sí",
  "sources.enabled.no": "No",
  "sources.btn.enable": "Activar",
  "sources.btn.disable": "Desactivar",
  "sources.btn.tooltip": "Deshabilitado hasta F2 auth",
});

export function adminT(key: keyof AdminDict): string {
  return adminEs[key];
}
