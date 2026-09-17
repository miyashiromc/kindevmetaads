# 🚀 Kindev Meta Ads CAPI Dashboard

Sistema de atribución de ventas de WhatsApp y entrenamiento del algoritmo de Meta mediante la API de Conversiones (CAPI) para **Kindev S.A.S.**

---

## 🌐 Despliegue en Producción
- **URL en vivo:** [https://kindevmetaads.web.app](https://kindevmetaads.web.app)
- **Firebase Project:** `kindevmetaads`
- **Meta Dataset ID:** `1368429478371391`

---

## ⚡ Características
- **Captura rápida de leads:** Normalización automática de teléfonos de Ecuador (`09x` ➔ `5939x`).
- **Botones de 1 toque con tarifas oficiales Kindev 2026:**
  - $60 (Landing Express)
  - $120 (Web Corporativa Base)
  - $260 (Web Corporativa Pro)
  - $400 (Plataforma Base)
  - Monto personalizado
- **Motor CAPI en tiempo real:** Hasheo SHA-256 nativo de teléfonos y correos electrónicos con despacho a Meta Graph API v19.0.
- **Sincronización en la Nube:** Conexión en tiempo real con Cloud Firestore.
- **Seguridad y Control de Acceso:** Security Gate con autenticación por PIN (`kindev2026`), cabeceras HTTP reforzadas (`X-Frame-Options: DENY`, `nosniff`), reglas de Firestore estrictas y escape HTML contra XSS.

---

## 🛠️ Ejecución Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor local
npm start
# Abre en tu navegador http://localhost:3000
```
