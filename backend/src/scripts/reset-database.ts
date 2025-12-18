import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import all models to ensure they're registered
import { UserModel } from '../models/User';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

async function resetDatabase() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    
    // Get MongoDB URI
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    
    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB');
    
    // Show current database
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    const dbName = db.databaseName;
    console.log(`\n📊 Base de datos actual: ${dbName}`);
    
    // Get all collections
    const collections = await db.collections();
    console.log(`\n📦 Colecciones encontradas (${collections.length}):`);
    
    for (const collection of collections) {
      const count = await collection.countDocuments();
      console.log(`   - ${collection.collectionName}: ${count} documentos`);
    }
    
    // Confirmation
    console.log('\n⚠️  ADVERTENCIA: Esta acción eliminará TODOS los datos de la base de datos.');
    console.log('⚠️  Esta acción NO se puede deshacer.\n');
    
    const confirm = await question('¿Estás seguro de que quieres eliminar todos los datos? (escribe "ELIMINAR" para confirmar): ');
    
    if (confirm !== 'ELIMINAR') {
      console.log('❌ Operación cancelada.');
      rl.close();
      await mongoose.connection.close();
      process.exit(0);
    }
    
    console.log('\n🗑️  Eliminando datos...\n');
    
    // Drop all collections
    let deletedCount = 0;
    for (const collection of collections) {
      const count = await collection.countDocuments();
      await collection.deleteMany({});
      console.log(`   ✅ ${collection.collectionName}: ${count} documentos eliminados`);
      deletedCount += count;
    }
    
    console.log(`\n✅ Base de datos limpiada exitosamente!`);
    console.log(`📊 Total de documentos eliminados: ${deletedCount}`);
    
    // Ask if user wants to create an admin user
    console.log('\n');
    const createAdmin = await question('¿Deseas crear un usuario administrador? (s/n): ');
    
    if (createAdmin.toLowerCase() === 's') {
      const email = await question('Email: ');
      const password = await question('Contraseña: ');
      const name = await question('Nombre completo: ');
      
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const adminUser = new UserModel({
        email,
        password: hashedPassword,
        name,
        role: 'admin'
      });
      
      await adminUser.save();
      console.log('\n✅ Usuario administrador creado exitosamente!');
      console.log(`   Email: ${email}`);
      console.log(`   Nombre: ${name}`);
      console.log(`   Role: admin`);
    }
    
    console.log('\n🎉 Proceso completado!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
    await mongoose.connection.close();
    console.log('\n👋 Desconectado de MongoDB');
    process.exit(0);
  }
}

// Run the script
resetDatabase();
