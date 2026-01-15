# Finanzas Ale & Ricardo

App para controlar gastos y pagar deudas.

## Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env.local` y llena las variables:

```bash
cp .env.example .env.local
```

Necesitas:
- **ANTHROPIC_API_KEY**: Tu API key de Anthropic (para el chat con Claude)
- **Supabase** (opcional): Para guardar datos en la nube

### 3. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### 4. Deploy en Vercel

1. Sube el proyecto a GitHub
2. Conecta el repo en [vercel.com](https://vercel.com)
3. Agrega las variables de entorno en Vercel
4. Deploy!

## Funciones

- **Dashboard**: Ve tu progreso de deudas
- **Registrar gastos**: Lleva el control diario
- **Chat con Claude**: Pregunta sobre tus finanzas
- **Configuración**: Actualiza saldos y datos
