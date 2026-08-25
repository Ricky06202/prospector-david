/** Da icono, tagline y GRUPO estructural según el giro del negocio. */
export function infoTipo(tipo: string): { icono: string; tagline: string; giro: string } {
  const t = tipo.toLowerCase();
  if (/restaur|comida|cafeter|bar|helad|picanter|buffet/.test(t))
    return { icono: "plato", tagline: `El mejor sabor en David, hecho con dedicación.`, giro: "gastronomia" };
  if (/belleza|barber|sal[óo]n|est[ée]tic|peluquer|u[ñn]as|spa/.test(t))
    return { icono: "belleza", tagline: `Belleza y estilo con atención dedicada.`, giro: "belleza" };
  if (/automotriz|taller|mec[áa]nic|repuesto|llantas|veh[ií]culo/.test(t))
    return { icono: "llave", tagline: `Servicio automotriz confiable para tu vehículo.`, giro: "automotriz" };
  if (/cl[íi]nic|salud|veterinaria|dental|m[ée]dic|farmac/.test(t))
    return { icono: "salud", tagline: `Cuidado profesional con atención personalizada.`, giro: "salud" };
  if (/refrig|aire acond/.test(t))
    return { icono: "frio", tagline: `Equipos y repuestos de refrigeración y A/C.`, giro: "automotriz" };
  if (/agr[íi]col|agropecu|agroind|agro/.test(t))
    return { icono: "hoja", tagline: `Comprometidos con el campo y la comunidad.`, giro: "general" };
  if (/construcc|ingenier[íi]a|concreto|asfalto/.test(t))
    return { icono: "obras", tagline: `Solidez y calidad en cada proyecto.`, giro: "general" };
  if (/tecnolog|comunicaci|digital|sistemas|inform[áa]tic/.test(t))
    return { icono: "tech", tagline: `Innovación y tecnología al servicio de la zona.`, giro: "general" };
  if (/log[íi]stic|transporte|encomienda|aduanas|carga|mudanza/.test(t))
    return { icono: "camion", tagline: `Logística y transporte con puntualidad.`, giro: "general" };
  if (/abogad|jur[íi]dic|legal|notar|consultor/.test(t))
    return { icono: "abogado", tagline: `Asesoría profesional y confidencial.`, giro: "general" };
  if (/hotel|turismo|viajes|tour/.test(t))
    return { icono: "viaje", tagline: `Las mejores experiencias para ti.`, giro: "gastronomia" };
  if (/supermerc|comercial|tienda|almacen|distribuid/.test(t))
    return { icono: "tienda", tagline: `Todo lo que necesitas, en un solo lugar.`, giro: "tienda" };
  if (/eventos|publicidad|impres/.test(t))
    return { icono: "evento", tagline: `Creatividad y resultados que se notan.`, giro: "general" };
  return { icono: "estrella", tagline: `Un negocio de confianza en David, Chiriquí.`, giro: "general" };
}
