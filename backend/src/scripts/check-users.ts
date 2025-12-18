import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { UserModel } from '../models/User';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuarios en la base de datos...\n');

    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ Error: MONGODB_URI no está configurado en .env');
      process.exit(1);
    }

    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB\n');

    const users = await UserModel.find({});
    
    if (users.length === 0) {
      console.log('⚠️  No hay usuarios en la base de datos');
      console.log('💡 Ejecuta "npm run create-admin" para crear un usuario administrador\n');
    } else {
      console.log(`📊 Total de usuarios: ${users.length}\n`);
      console.log('👥 Usuarios encontrados:');
      console.log('='.repeat(60));
      
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. Usuario:`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Nombre: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Creado: ${user.createdAt}`);
        console.log(`   Último login: ${user.lastLogin || 'Nunca'}`);
        console.log(`   Password hash (primeros 20 chars): ${user.password.substring(0, 20)}...`);
      });
      
      console.log('\n' + '='.repeat(60));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Desconectado de MongoDB');
    process.exit(0);
  }
}

checkUsers();
