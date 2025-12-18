import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import readline from 'readline';
import path from 'path';
import { UserModel } from '../models/User';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

async function createAdmin() {
  try {
    console.log('🔐 Hot Wheels Manager - Crear Usuario Administrador');
    console.log('====================================================\n');

    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ Error: MONGODB_URI no está configurado en .env');
      process.exit(1);
    }

    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB\n');

    // Get user input
    const email = await question('📧 Email del admin: ');
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Error: Email inválido');
      rl.close();
      await mongoose.connection.close();
      process.exit(1);
    }

    // Check if email already exists
    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.error(`❌ Error: Ya existe un usuario con el email ${email}`);
      rl.close();
      await mongoose.connection.close();
      process.exit(1);
    }

    const password = await question('🔑 Contraseña (mínimo 6 caracteres): ');
    
    if (password.length < 6) {
      console.error('❌ Error: La contraseña debe tener al menos 6 caracteres');
      rl.close();
      await mongoose.connection.close();
      process.exit(1);
    }

    const name = await question('👤 Nombre completo: ');

    if (!name || name.trim().length === 0) {
      console.error('❌ Error: El nombre es requerido');
      rl.close();
      await mongoose.connection.close();
      process.exit(1);
    }

    // Create admin user
    console.log('\n🔐 Hasheando contraseña...');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('👤 Creando usuario administrador...');
    const user = await UserModel.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name.trim(),
      role: 'admin'
    });

    console.log('\n✅ ¡Usuario administrador creado exitosamente!');
    console.log('\n📝 Credenciales:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Nombre: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log('\n🚀 Ahora puedes iniciar sesión en el dashboard con estas credenciales');

  } catch (error) {
    console.error('❌ Error al crear usuario administrador:', error);
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.connection.close();
    console.log('\n👋 Desconectado de MongoDB');
    process.exit(0);
  }
}

// Run the script
createAdmin();
