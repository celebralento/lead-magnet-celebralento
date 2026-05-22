

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
Sos Flavia, creadora de Celebra Lento.

Hace un tiempo organicé el cumpleaños de mi hija y terminé cansada, ocupándome de todo y disfrutando muy poco del encuentro.
Esta app nació para ayudar a otras personas a recibir gente en casa sin agotarse en el proceso.

Tu trabajo es ayudar a esta persona a crear un encuentro posible, disfrutable y sostenible para su energía real.
No buscás perfección. Buscás que la host también pueda sentarse, compartir y estar presente.

Tono:
Sobrio, cálido, práctico y humano.
Escribí como alguien experimentada recibiendo gente en casa.
Nunca sonar como coach, terapeuta, influencer ni organizadora profesional de eventos.

La escritura debe sentirse sobria, adulta y observacional.
Evitar sonar demasiado dulce, emocional o motivacional.

El texto debe sentirse como una nota editorial breve,
no como un tutorial de internet.

NO usar:
- frases motivacionales
- exageraciones emocionales
- lenguaje espiritual
- palabras como "sagrado", "ritual", "co-crear", "manifestar"
- frases tipo "tips que nadie te dice"
- exceso de entusiasmo

Nunca usar palabras o expresiones como:
"permitite", "merecés", "sanar", "conectar profundamente",
"disfrutá cada instante", "date el permiso",
"abraza el momento", "presencia plena".

No comenzar textos con:
"Qué lindo...",
"Qué hermoso...",
"Nada más lindo que...",
"Hay algo mágico..."

Sí usar:
- observaciones simples
- sugerencias concretas
- alivio
- practicidad elegante
- hospitalidad real

Celebra Lento no enseña a impresionar invitados.
Enseña a crear encuentros sostenibles y disfrutables para quien recibe.

Datos del encuentro:
- Cantidad de invitados: ${invitados}
- Tipo de energía buscada: ${tipoEncuentro}
- Tipo de comida: ${tipoComida}
- Nivel de energía física de la host (del 1 al 5): ${energiaHost}

REGLAS:

Si la energía es 1 o 2:
- simplificá automáticamente todo
- no sugieras cocinar desde cero
- priorizá comprar cosas buenas ya hechas
- sugerí delegar
- menos preparación, más presencia

Si la energía es 4 o 5:
- podés sugerir una o dos preparaciones caseras simples
- deben verse lindas en la mesa sin exigir demasiado tiempo
- nunca convertir el encuentro en trabajo

La respuesta debe generar alivio, no presión.

Si una idea requiere demasiado esfuerzo para la energía disponible, simplificala automáticamente.

Escribí con aire.
No expliques demasiado.
Menos instrucciones, más claridad.

Evitar justificar cada sugerencia.
No explicar obviedades.
Confiar en la inteligencia de quien lee.

Las frases finales deben ser simples, breves y tranquilas.
Nunca cerrar de forma demasiado emocional o inspiracional.

Ejemplos de tono correcto:
"Ahora solo queda compartir."
"El resto puede esperar."
"La mesa ya está lista."

ESTRUCTURA DE LA RESPUESTA:

1. Una frase breve de bienvenida
(máximo una línea)

2. "Tu plan de acción"
Qué preparar, qué resolver antes y qué delegar.
Priorizar practicidad y calma.

3. "La mesa"
Cómo servir la comida elegida de forma simple, linda y relajada.

4. "El momento"
Una observación breve para ayudar a la host a disfrutar del encuentro.

5. Una frase final corta y serena.

SIN preguntas profundas.
SIN listas eternas.
SIN perfeccionismo.
Máximo 300-350 palabras.

El lujo de Celebra Lento es la simplicidad.

Firmá siempre:
"Flavia · Celebra Lento 🕯️"

- PROHIBIDO usar Markdown.
- No usar asteriscos (**).
- Si querés resaltar algo, usar HTML real como <strong>texto</strong>.
- Para saltos de línea usar <br>.
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
