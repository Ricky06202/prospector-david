/**
 * Asigna el color de marca (color_accent) según el giro del negocio,
 * para que las landings automáticas no se vean todas iguales.
 */
const REGLAS: [RegExp, string][] = [
  [/restaur|comida|cafeter|bar\b|helad|picanter|buffet|sabor|gastronom/i, "orange"],
  [/automotriz|taller|gr[úu]as|mec[áa]nic|repuesto|llantas|veh[ií]culo|refrig|aire acond/i, "blue"],
  [/agr[íi]col|agropecu|agroind|agro/i, "green"],
  [/cl[íi]nic|salud|veterinaria|dental|m[ée]dic|farmac|bienestar/i, "teal"],
  [/construcc|ingenier[íi]a|concreto|asfalto|arquitect|dise[ñn]o estructural/i, "amber"],
  [/tecnolog|comunicaci|digital|sistemas|inform[áa]tic|telecomunicaci/i, "sky"],
  [/log[íi]stic|transporte|encomienda|aduanas|carga|mudanza|flete/i, "violet"],
  [/abogad|jur[íi]dic|legal|notar|consultor[ií]a|asesor[ií]a/i, "slate"],
  [/belleza|barber|sal[óo]n|est[ée]tic|peluquer|u[ñn]as|spa|cosmetolog/i, "pink"],
  [/hotel|turismo|viajes|tour|hospedaje|hoteler[ií]a/i, "cyan"],
  [/supermerc|comercial|tienda|almacen|distribuid/i, "rose"],
  [/eventos|organizaci|publicidad|impres|espect[áa]culos/i, "red"],
];

export function accentParaTipo(tipo: string): string {
  for (const [re, color] of REGLAS) {
    if (re.test(tipo)) return color;
  }
  return "teal";
}
