# 🛡️ Guía Oficial: Token de la API de Conversiones de Meta (CAPI)
**Kindev S.A.S. — Infraestructura de Atribución y Entrenamiento de Algoritmo**

---

## 📌 1. ¿Qué es este código?

El código que acabas de generar (`EAAPkg...`) es un **Token de Acceso de Usuario del Sistema / Dataset de Meta (Meta System User Access Token)** con alcance para la **API de Conversiones (Conversions API - CAPI)** y **Dataset Quality API**.

Es la llave criptográfica que autentica a tu servidor (Node.js, Firebase Cloud Functions, Python, etc.) directamente ante los servidores de Meta Graph API sin requerir que un humano inicie sesión.

---

## 🚀 2. ¿Para qué sirve?

1. **Entrenar el algoritmo con ventas reales:**  
   Permite enviar eventos como `Purchase` (Compra) o `Lead` (Cliente potencial calificado) desde tu base de datos o backend directamente al conjunto de datos de Meta (`Dataset ID: 1368429478371391`).
2. **Atribución de ventas cerradas por WhatsApp:**  
   Cuando un prospecto te escribe desde un anuncio y le vendes un proyecto web (\$120, \$260, \$600+), tu servidor le envía a Meta el teléfono del cliente (cifrado en SHA-256) y el monto facturado. Meta cruza el teléfono y premia al anuncio que generó la venta.
3. **Auditoría de calidad (Dataset Quality API):**  
   Permite a tu sistema consultar la puntuación de calidad de coincidencias de eventos (Event Match Quality - EMQ) para saber qué tan bien se están reconociendo tus clientes.

---

## ⚠️ 3. Nivel de Criticidad y Cuidados de Seguridad

> [!CAUTION]
> **ESTE TOKEN ES UNA CLAVE MAESTRA PRIVADA DE TU NEGOCIO.**  
> Trátalo con el mismo nivel de confidencialidad que la contraseña de tu base de datos o las llaves privadas de Stripe/PayPhone.

### Reglas estrictas de seguridad:

* 🚫 **NUNCA lo expongas en el Frontend / Cliente:**  
  Jamás coloques este token dentro de archivos React, Next.js (en variables sin prefijo privado), páginas HTML, apps móviles o JavaScript del navegador. Cualquiera con "Inspeccionar elemento" podría extraerlo.
* 🚫 **NUNCA lo subas a GitHub / GitLab:**  
  No debe ir en repositorios de código públicos ni compartidos. Ya dejamos configurado el archivo `.gitignore` para bloquear archivos de credenciales.
* 🔒 **Úsalo exclusivamente desde el Servidor:**  
  Solo debe residir en variables de entorno seguras (`.env`) en tus Firebase Cloud Functions, Supabase Edge Functions, VPS o contenedor backend.
* 🔄 **¿Qué hacer si se filtra o sospechas de una brecha?**  
  Si alguien llegara a obtener este token, podría inyectar eventos de compra falsos a tu cuenta publicitaria, alterando el algoritmo de Meta o consumiendo tus límites de API.  
  Si se compromete:
  1. Ve de inmediato al **Administrador de Eventos** de Meta.
  2. Entra en la pestaña **Configuración** de tu Dataset.
  3. En la sección *API de conversiones*, revoca el token actual y genera uno nuevo con 1 clic.

---

## 📋 4. Ficha Técnica de tu Integración

| Parámetro | Valor |
| :--- | :--- |
| **Nombre del Dataset** | `Kindev plus ads ok` |
| **Dataset ID** | `1368429478371391` |
| **Business Portfolio ID** | `1120770117796204` |
| **Cuenta Publicitaria** | `Kindev Ads (4362799907368161)` |
| **Endpoint Oficial de Meta** | `https://graph.facebook.com/v19.0/1368429478371391/events` |
| **Método HTTP** | `POST` |
| **Header de autenticación** | `?access_token={META_ACCESS_TOKEN}` |

---

## 🧪 5. Siguiente Paso: Prueba en Vivo

Para validar que Meta recibe tus datos sin afectar tus métricas reales de publicidad:
1. Ve a la pestaña **`Probar eventos`** (*Test Events*) en el Administrador de eventos de Meta.
2. En la sección de servidor, copia el **Código de prueba** que empieza por `TEST...` (ej. `TEST12345`).
3. Ejecutamos el script de prueba y verás el evento aparecer instantáneamente en pantalla en color verde.
