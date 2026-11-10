# Seguridad

[Français](SECURITY.md) · [English](SECURITY.en.md) · [Español](SECURITY.es.md) · [Deutsch](SECURITY.de.md)

Política actualizada el 10 de noviembre de 2026 para la versión 1.4.0. La línea compatible es `1.4.x`; su última versión recibe correcciones de seguridad.

No abras una issue pública para una vulnerabilidad explotable. Usa el [informe privado de GitHub](https://github.com/ScioNos/Scionos-Capture/security/advisories/new) o contacta con `info@eyelo.ch` e incluye versión, impacto, pasos y una prueba no destructiva cuando sea posible.

El objetivo es responder en 3 días laborables y dar una evaluación inicial en 7. La divulgación coordinada ocurre después de disponer de una corrección.

Las capturas, incluidos los mosaicos de un área desplazable, permanecen en el origen local. No se ejecutan scripts remotos y el nuevo modo no añade permisos. Las huérfanas caducan tras quince minutos. Usa máscara sólida para secretos; el desenfoque no es una eliminación criptográfica.

La capa de búsqueda del PDF conserva solo palabras completas cuya visibilidad puede verificarse. Las palabras inciertas se omiten de esa capa y se conserva la imagen capturada. También se omiten las capas antiguas con coordenadas no verificadas. Usa censura sólida para proteger píxeles confidenciales; el desenfoque es solo visual.

Aplica o cancela los cambios pendientes antes de exportar. El desenfoque es un efecto visual; usa una máscara sólida para secretos.
