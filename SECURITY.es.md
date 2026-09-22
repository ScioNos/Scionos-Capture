# Seguridad

[Français](SECURITY.md) · [English](SECURITY.en.md) · [Español](SECURITY.es.md) · [Deutsch](SECURITY.de.md)

La última release publicada recibe correcciones de seguridad; la línea compatible actual es `1.2.x` (la release `1.2.0` está en preparación).

No abras una issue pública para una vulnerabilidad explotable. Usa el [informe privado de GitHub](https://github.com/ScioNos/Scionos-Capture/security/advisories/new) o contacta con `info@eyelo.ch` e incluye versión, impacto, pasos y una prueba no destructiva cuando sea posible.

El objetivo es responder en 3 días laborables y dar una evaluación inicial en 7. La divulgación coordinada ocurre después de disponer de una corrección.

Las capturas, incluidos los mosaicos de un área desplazable, permanecen en el origen local. No se ejecutan scripts remotos y el nuevo modo no añade permisos. Las huérfanas caducan tras quince minutos. Usa máscara sólida para secretos; el desenfoque no es una eliminación criptográfica.
