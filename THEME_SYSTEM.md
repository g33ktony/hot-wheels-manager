# Sistema de Temas Dinámicos - Documentación

## 📋 Resumen

El sistema de temas ahora soporta cambio completo entre dark/light mode y un configurador personalizado de colores. Todos los colores están en formato RGB para uso en estilos inline.

## 🎯 Cómo Usar en Componentes

### 1. Importar useTheme

```typescript
import { useTheme } from '@/contexts/ThemeContext'

export default function MyComponent() {
  const { colors, mode } = useTheme()
  
  return (
    <div>
      {/* Usar colores en style inline */}
      <p style={{ color: colors.text.primary }}>Texto principal</p>
      <p style={{ color: colors.text.secondary }}>Texto secundario</p>
      
      {/* Para bordes: */}
      <div style={{ borderColor: colors.border.primary }}>Contenido</div>
      
      {/* Para acentos (precios, éxito, etc): */}
      <span style={{ color: colors.ui.greenAccent }}>$100.00</span>
    </div>
  )
}
```

### 2. Colores Disponibles

#### text (RGB values)
- `colors.text.primary` - Texto principal (blanco en dark, gris oscuro en light)
- `colors.text.secondary` - Texto secundario (slate-300 en dark, gray-700 en light)
- `colors.text.tertiary` - Texto terciario más muted
- `colors.text.muted` - Texto silenciado
- `colors.text.danger` - Rojo para errores
- `colors.text.success` - Verde para éxito
- `colors.text.warning` - Amarillo para advertencias
- `colors.text.info` - Azul para información

#### border (RGB values)
- `colors.border.primary` - Borde principal
- `colors.border.secondary` - Borde secundario (más claro)
- `colors.border.input` - Borde para inputs
- `colors.border.hover` - Borde al hacer hover

#### ui (RGB values - para acentos)
- `colors.ui.emeraldAccent` - Verde esmeralda
- `colors.ui.blueAccent` - Azul
- `colors.ui.redAccent` - Rojo
- `colors.ui.greenAccent` - Verde (precios)
- `colors.ui.orangeAccent` - Naranja
- `colors.ui.purpleAccent` - Púrpura

#### cssVars (strings para uso directo)
- Alternativa a los RGB values
- `colors.cssVars.textPrimary`, etc.

#### bg (Tailwind classes - NO cambiar)
- `colors.bg.primary` - `bg-slate-900` (dark) / `bg-white` (light)
- `colors.bg.secondary` - `bg-slate-800` (dark) / `bg-gray-50` (light)
- Etc. (todas las clases Tailwind)

### 3. Ejemplos Prácticos

#### Precio/Cantidad
```typescript
<span style={{ color: colors.ui.greenAccent, fontWeight: 'bold' }}>
  ${price}
</span>
```

#### Etiqueta de Estado
```typescript
<span style={{ color: colors.text.success }}>
  Completado
</span>
```

#### Borde de Input
```typescript
<input
  style={{
    borderColor: colors.border.input,
    color: colors.text.primary,
  }}
  className="px-3 py-2 border rounded"
/>
```

#### Texto Muted (Descripción)
```typescript
<p style={{ color: colors.text.muted }}>
  Información adicional
</p>
```

## 🎨 Página de Configuración

**Ruta:** `/theme-settings`

En esta página puedes:
1. Cambiar cualquier color de texto, borde o acento
2. Ver vista previa de colores en tiempo real
3. Guardar configuración (se guarda en localStorage)
4. Restaurar colores por defecto

## 💾 Persistencia

- El modo (dark/light) se guarda en `localStorage['theme-mode']`
- Los colores personalizados se guardan en `localStorage['theme-custom']`
- Los cambios se aplican automáticamente al recargar la página

## 🔄 Refrescarse y Ver Cambios

Después de cambiar colores en Theme Settings:
1. Los colores se guardan automáticamente
2. La página se ACTUALIZA automáticamente (se refresca)
3. Todos los componentes usando `useTheme()` recibirán los nuevos colores

## ✨ Características Principales

✅ **Tema completo:** Cambia entre dark/light con botón ☀️/🌙
✅ **Colores personalizables:** Edita cada color en Theme Settings
✅ **Persistencia:** Los cambios se guardan en el navegador
✅ **Dinámico:** Todos los componentes responden al tema
✅ **RGB values:** Compatible con estilos inline (no limitado a Tailwind)
✅ **Backgrounds fijos:** El fondo de la app siempre es gris (dark) o blanco (light)

## 🐛 Si un componente no está usando tema

1. Busca `className="text-gray-900"` o similar
2. Cambia a `style={{ color: colors.text.primary }}`
3. Importa `useTheme` al principio
4. Haz commit del cambio

Ejemplo de migración:

```typescript
// ANTES
<p className="text-gray-900">Precio</p>

// DESPUÉS  
const { colors } = useTheme()
<p style={{ color: colors.text.primary }}>Precio</p>
```

## 📞 Soporte

Si un color no se muestra correctamente después de cambiar tema:
- Verifica que el componente esté usando `useTheme()`
- Revisa que esté usando `colors.text.*` en lugar de clases Tailwind hardcodeadas
- Asegúrate de que no hay estilos en línea conflictivos

