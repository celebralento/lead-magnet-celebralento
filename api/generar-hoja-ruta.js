const { globalThis } = require("next/dist/compiled/@edge-runtime/primitives");

// Mantenemos tu función original de reintentos intacta
async function llamarGemini(url, body, maxIntentos = 5) {
  for (let intento = 1; intento <= maxIntentos; intento++) {
    const respuesta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (respuesta.ok) {
      return respuesta;
    }

    const errorTexto = await respuesta.text();
    console.log(`Intento ${intento}`, respuesta.status);

    if ((respuesta.status === 429 || respuesta.status === 503) && intento < maxIntentos) {
      const espera = intento * 5000;
      await new Promise(r => setTimeout(r, espera));
      continue;
    }

    throw new Error(`Google ${respuesta.status}: ${errorTexto}`);
  }
  throw new Error("No se pudo conectar con Gemini");
}

// Cambiamos al formato nativo de Vercel (req, res)
module.exports = async (req, res) => {
  // Configuración de cabeceras CORS para Vercel
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Manejo de la petición OPTIONS (Preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    // En Vercel, req.body ya viene parseado automáticamente como objeto
    const { invitados, tipoEncuentro, tipoComida, energiaHost } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Falta API key" });
    }

    // Tu prompt optimizado exacto
    const promptSistema = `
Sos Flavia, la creadora de Celebra Lento.

Una vez organicé el cumpleaños de mi hija y quedé exhausta. 
Tanto que me propuse crear algo para que eso no le pase a nadie más.
Esta app es ese algo.

Tu trabajo es ayudar a esta persona a organizar su festejo en casa
sin que termine agotada, sin que gaste de más y sin que sienta
que fracasó si no quedó perfecto.

Tono: como una amiga que ya organizó mil fiestas y te da los tips
que nadie te dice. Directo, cálido, práctico. Sin filosofía.
Sin palabras como "sagrado", "ritual", "intencional" o "co-crear".

Datos del encuentro:
- Cantidad de invitados: ${invitados}
- Tipo de energía buscada: ${tipoEncuentro}
- Tipo de comida: ${tipoComida}
- Nivel de energía física de la host (del 1 al 5): ${energiaHost}

REGLAS:

Si la energía es 1 o 2:
Sé muy clara — nada de cocinar desde cero. 
Comprar, delegar, armar una tabla al centro y sentarse.
El mejor regalo para los invitados es la host descansada y presente.

Si la energía es 4 o 5:
Podés sugerir una o dos cosas caseras simples que den impacto visual
sin requerir demasiado tiempo — algo que se vea bonito en la mesa.

ESTRUCTURA DE LA RESPUESTA:
1. Una frase de bienvenida — máximo una línea
2. "Tu plan de acción" — qué hacer, en qué orden, qué delegar
3. "La mesa" — qué poner, cómo organizarla según la comida elegida
4. "El momento" — un tip para estar presente durante la fiesta,
    no solo organizando
5. Una frase de cierre corta

SIN preguntas de conexión profunda — eso es para otro momento.
Máximo 400 palabras. Párrafos cortos. Títulos simples.

Firmá como: "Flavia · Celebra Lento 🕯️"

- PROHIBIDO usar formato Markdown (no uses asteriscos ** para las negritas ni guiones para las listas).
- Si quieres resaltar un título o una palabra en negrita, usa etiquetas HTML reales como <strong>texto</strong> o <b>texto</b>.
- Para los saltos de línea, usa la etiqueta <br>.
`;

    const modelos = ["gemini-2.5-flash"];
    let respuestaApi;

    for (const modelo of modelos) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelo}:generateContent?key=${apiKey}`;
        
        respuestaApi = await llamarGemini(url, {
          contents: [{ parts: [{ text: promptSistema }] }]
        });
        
        console.log(`modelo usado: ${modelo}`);
        break;
      } catch (e) {
        console.log(`falló ${modelo}`, e.message);
      }
    }

    if (!respuestaApi) {
      throw new Error("Ningún modelo respondió");
    }

    const dataJson = await respuestaApi.json();
    const textoGenerado = dataJson.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta";

    // Formato de respuesta nativo de Vercel
    return res.status(200).json({ resultado: textoGenerado });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error interno", detalle: error.message });
  }
};
