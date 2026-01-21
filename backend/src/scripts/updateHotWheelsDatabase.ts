import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface HotWheelsEntry {
  toy_num: string;
  col_num: string;
  model: string;
  series: string;
  series_num: string;
  photo_url?: string;
  year: string;
}

/**
 * Scraper para actualizar la base de datos de Hot Wheels desde la Wiki de Fandom
 * URLs base:
 * - https://hotwheels.fandom.com/wiki/{YEAR}_Hot_Wheels_models (para modelos anuales)
 * - https://hotwheels.fandom.com/wiki/Treasure_Hunt (para Treasure Hunts)
 * 
 * NOTA: Esto es un template. La estructura real de la wiki puede variar.
 * Necesitas verificar el HTML actual y ajustar los selectores CSS según sea necesario.
 */

const BASE_WIKI_URL = 'https://hotwheels.fandom.com/wiki';
const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR = 1995;

const WIKI_STRUCTURE = {
  // Estructura por año (puede variar)
  byYear: (year: number) => `${BASE_WIKI_URL}/${year}_Hot_Wheels_models`,
  // Páginas especiales
  treasureHunt: `${BASE_WIKI_URL}/Treasure_Hunt`,
  superTreasureHunt: `${BASE_WIKI_URL}/Super_Treasure_Hunt`,
  mainCatalog: `${BASE_WIKI_URL}/Hot_Wheels_Wiki:Main_Catalog`,
};

/**
 * Obtiene datos de una tabla HTML y los parsea
 * IMPORTANTE: Esta es una implementación template - necesitas adaptarla a la estructura actual
 */
async function scrapeYearModels(year: number): Promise<HotWheelsEntry[]> {
  try {
    console.log(`📥 Descargando datos de ${year}...`);
    const url = WIKI_STRUCTURE.byYear(year);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const html = response.data;
    const entries: HotWheelsEntry[] = [];

    // NOTA: Estos selectores son ejemplos y DEBEN ser ajustados según la estructura actual de la wiki
    // Puedes inspeccionar la página en:
    // https://hotwheels.fandom.com/wiki/2015_Hot_Wheels_models
    // Y ajustar los selectores CSS aquí
    
    // Ejemplo de parseo básico (necesita ser refinado):
    // Buscar todas las tablas que contengan datos de Hot Wheels
    const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/g;
    const tables = html.match(tableRegex) || [];

    for (const table of tables) {
      // Buscar filas (tr)
      const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
      const rows = table.match(rowRegex) || [];

      for (const row of rows) {
        // Buscar celdas (td)
        const cellRegex = /<td[^>]*>[\s\S]*?<\/td>/g;
        const cells = row.match(cellRegex) || [];

        if (cells.length >= 3) {
          // Extraer texto de celdas
          const extractText = (html: string): string => {
            return html
              .replace(/<[^>]*>/g, '')
              .replace(/&nbsp;/g, ' ')
              .trim();
          };

          const entry: HotWheelsEntry = {
            toy_num: extractText(cells[0] || ''),
            col_num: extractText(cells[1] || ''),
            model: extractText(cells[2] || ''),
            series: extractText(cells[3] || ''),
            series_num: extractText(cells[4] || ''),
            year: year.toString()
          };

          // Solo agregar si tiene modelo
          if (entry.model) {
            entries.push(entry);
          }
        }
      }
    }

    console.log(`✅ ${entries.length} modelos encontrados para ${year}`);
    return entries;
  } catch (error: any) {
    console.warn(`⚠️  Error descargando datos de ${year}:`, error.message);
    return [];
  }
}

/**
 * Ejecuta el scraper completo para todos los años
 */
async function updateHotWheelsDatabase(): Promise<void> {
  console.log('🚀 Iniciando actualización de base de datos Hot Wheels...');
  console.log(`📅 Rango: ${START_YEAR} - ${CURRENT_YEAR}`);

  const allEntries: HotWheelsEntry[] = [];
  let successCount = 0;
  let errorCount = 0;

  // Descargar datos por año
  for (let year = START_YEAR; year <= CURRENT_YEAR; year++) {
    try {
      const yearData = await scrapeYearModels(year);
      allEntries.push(...yearData);
      successCount++;

      // Pequeña pausa para no sobrecargar el servidor
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Error procesando ${year}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`✅ Años procesados: ${successCount}`);
  console.log(`❌ Años con error: ${errorCount}`);
  console.log(`📦 Total de modelos: ${allEntries.length}`);

  // Guardar en archivo
  if (allEntries.length > 0) {
    const outputPath = path.join(__dirname, '../../data/hotwheels_database.json');
    fs.writeFileSync(outputPath, JSON.stringify(allEntries, null, 2));
    console.log(`\n💾 Base de datos actualizada: ${outputPath}`);
  } else {
    console.log('\n⚠️  No se obtuvieron datos. Verifica la estructura de la wiki y ajusta los selectores CSS.');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateHotWheelsDatabase()
    .then(() => {
      console.log('\n✅ Actualización completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

export { updateHotWheelsDatabase, scrapeYearModels };
