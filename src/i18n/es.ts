import { z } from "zod";

/**
 * DictSchema — authoritative dictionary shape.
 * Both ES and EN must satisfy this schema (enforced at compile time via Dict type).
 */
export const DictSchema = z.object({
  "nav.home": z.string(),
  "nav.models": z.string(),
  "nav.guides": z.string(),
  "nav.services": z.string(),
  "home.title": z.string(),
  "home.subtitle": z.string(),
  "home.cta.signup": z.string(),
  "home.cta.placeholder": z.string(),
  "footer.legal": z.string(),
  "footer.imagery": z.string(),
  "theme.toggle": z.string(),
  "theme.labelLight": z.string(),
  "theme.labelDark": z.string(),
  "form.error.invalidEmail": z.string(),
  "form.success.signup": z.string(),
});

export type Dict = z.infer<typeof DictSchema>;

export const es = DictSchema.parse({
  "nav.home": "Inicio",
  "nav.models": "Modelos",
  "nav.guides": "Guías",
  "nav.services": "Talleres",
  "home.title": "Jinba — coches con alma, datos reales",
  "home.subtitle": "Precios vivos, fichas editoriales y talleres de confianza.",
  "home.cta.signup": "Unirme a la lista",
  "home.cta.placeholder": "tu@email.com",
  "footer.legal": "Aviso legal",
  "footer.imagery": "Política de imágenes",
  "theme.toggle": "Cambiar tema",
  "theme.labelLight": "Claro",
  "theme.labelDark": "Oscuro",
  "form.error.invalidEmail": "Introduce un email válido.",
  "form.success.signup": "¡Gracias! Te avisaremos cuando estemos listos.",
});
