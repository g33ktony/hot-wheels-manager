import scrapeIntelligent from './src/scripts/scrape-intelligent';

scrapeIntelligent(true).then((result: any) => {
  console.log('\n✅ SCRAPING COMPLETADO');
  console.log('📊 Total vehículos:', result.length);
  process.exit(0);
}).catch((err: any) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
