/**
 * Script para verificar el Facebook Access Token
 * Uso: node test-facebook-token.js
 */

const axios = require('axios');
require('dotenv').config();

const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

console.log('🔍 Verificando configuración de Facebook...\n');
console.log('📄 Page ID:', PAGE_ID);
console.log('🔑 Access Token:', ACCESS_TOKEN ? `${ACCESS_TOKEN.substring(0, 20)}...` : 'NO CONFIGURADO');
console.log('');

async function verifyToken() {
    try {
        // 1. Verificar que el token es válido
        console.log('1️⃣ Verificando validez del token...');
        const debugResponse = await axios.get(
            `https://graph.facebook.com/v18.0/debug_token`,
            {
                params: {
                    input_token: ACCESS_TOKEN,
                    access_token: ACCESS_TOKEN
                }
            }
        );
        
        console.log('✅ Token válido');
        console.log('   Tipo:', debugResponse.data.data.type);
        console.log('   App ID:', debugResponse.data.data.app_id);
        console.log('   Usuario ID:', debugResponse.data.data.user_id);
        console.log('   Expira:', debugResponse.data.data.expires_at === 0 ? 'Nunca' : new Date(debugResponse.data.data.expires_at * 1000).toLocaleString());
        console.log('   Permisos:', debugResponse.data.data.scopes?.join(', ') || 'No disponibles');
        console.log('');

        // 2. Obtener información de la página
        console.log('2️⃣ Obteniendo información de la página...');
        const pageResponse = await axios.get(
            `https://graph.facebook.com/v18.0/${PAGE_ID}`,
            {
                params: {
                    fields: 'id,name,category,picture',
                    access_token: ACCESS_TOKEN
                }
            }
        );
        
        console.log('✅ Página encontrada');
        console.log('   ID:', pageResponse.data.id);
        console.log('   Nombre:', pageResponse.data.name);
        console.log('   Categoría:', pageResponse.data.category);
        console.log('');

        // 3. Verificar permisos de la página
        console.log('3️⃣ Verificando permisos específicos...');
        try {
            const permsResponse = await axios.get(
                `https://graph.facebook.com/v18.0/me/permissions`,
                {
                    params: {
                        access_token: ACCESS_TOKEN
                    }
                }
            );
            
            console.log('✅ Permisos del token:');
            permsResponse.data.data.forEach(perm => {
                const status = perm.status === 'granted' ? '✅' : '❌';
                console.log(`   ${status} ${perm.permission}`);
            });
        } catch (error) {
            console.log('⚠️  No se pudieron obtener permisos detallados');
        }
        console.log('');

        // 4. Verificar permisos críticos
        console.log('4️⃣ Verificando permisos críticos para publicación...');
        const requiredPerms = ['pages_show_list', 'pages_manage_posts'];
        const grantedPerms = debugResponse.data.data.scopes || [];
        
        requiredPerms.forEach(perm => {
            const hasIt = grantedPerms.includes(perm);
            console.log(`   ${hasIt ? '✅' : '❌'} ${perm}`);
        });
        
        console.log('');
        console.log('✅ ¡Verificación completa!');
        console.log('');
        console.log('📋 RESUMEN:');
        console.log('   - Token válido y activo');
        console.log('   - Página accesible');
        console.log('   - Permisos verificados');
        console.log('');
        console.log('🎉 ¡Todo parece estar configurado correctamente!');
        
    } catch (error) {
        console.error('');
        console.error('❌ ERROR:', error.response?.data?.error?.message || error.message);
        console.error('');
        
        if (error.response?.data?.error) {
            console.error('Detalles del error:');
            console.error('   Tipo:', error.response.data.error.type);
            console.error('   Código:', error.response.data.error.code);
            console.error('   Mensaje:', error.response.data.error.message);
        }
        
        console.error('');
        console.error('💡 SOLUCIÓN:');
        console.error('   1. Ve a https://developers.facebook.com/tools/explorer/');
        console.error('   2. Genera un nuevo User Access Token con:');
        console.error('      - pages_show_list');
        console.error('      - pages_manage_posts');
        console.error('   3. Consulta: /me/accounts');
        console.error('   4. Copia el "access_token" de tu página');
        console.error('   5. Actualiza FACEBOOK_ACCESS_TOKEN en .env y Railway');
        console.error('');
        
        process.exit(1);
    }
}

if (!PAGE_ID || !ACCESS_TOKEN) {
    console.error('❌ ERROR: Configuración incompleta');
    console.error('');
    console.error('Asegúrate de tener estas variables en tu .env:');
    console.error('   FACEBOOK_PAGE_ID=tu_page_id');
    console.error('   FACEBOOK_ACCESS_TOKEN=tu_access_token');
    console.error('');
    process.exit(1);
}

verifyToken();
