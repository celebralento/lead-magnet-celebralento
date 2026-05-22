

// 1. FUNCIÓN AUXILIAR: Con reintentos rápidos (usando fetch nativo de Node.js)
async function llamarGemini(url, body, maxIntentos = 3) {
  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      // Usamos el fetch nativo global del sistema
      const respuesta = await globalThis.fetch(url, {
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
      console.log(`Intento ${intento} - Status: ${respuesta.status}`);

      // Si el servidor está saturado (429 o 503), esperamos tiempos cortos (1.5s, 3s)
      if ((respuesta.status === 429 || respuesta.status === 503) && intento < maxIntentos) {
        const espera = intento * 1500; 
        await new Promise(r => setTimeout(r, espera));
        continue;
      }

      throw new Error(`Google ${respuesta.status}: ${errorTexto}`);
    } catch (err) {
      if (intento === maxIntentos) throw err;
      await new Promise(r => setTimeout(r, 1500)); // Espera corta ante errores de red
    }
  }
  throw new Error("No se pudo conectar con Gemini tras los reintentos");
}

// 2. HANDLER PRINCIPAL DE NETLIFY (El resto del código se mantiene exactamente igual...)
// 2. HANDLER PRINCIPAL DE NETLIFY
exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Método no permitido"
    };
  }

  try {
    const datos = JSON.parse(event.body);
    const { invitados, tipoEncuentro, tipoComida, energiaHost } = datos;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Falta API key" })
      };
    }

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

    // CORRECCIÓN: Nombres de modelos válidos y reconocidos por la API v1 de Google
    const modelos = [
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro-latest"
    ];

    let respuestaApi;

    for (const modelo of modelos) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelo}:generateContent?key=${apiKey}`;
        console.log(`Intentando con modelo: ${modelo}...`);

        respuestaApi = await llamarGemini(url, {
          contents: [{ parts: [{ text: promptSistema }] }]
        });

        console.log(`¡Éxito con el modelo!: ${modelo}`);
        break; // Rompe el bucle de modelos si este funcionó
      } catch (e) {
        console.log(`Falló el modelo ${modelo}:`, e.message);
        // Sigue al siguiente modelo del array
      }
    }

    if (!respuestaApi) {
      throw new Error("Ninguno de los modelos (1.5-flash / 1.5-pro) pudo responder a tiempo.");
    }

    const dataJson = await respuestaApi.json();
    const textoGenerado = dataJson.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ resultado: textoGenerado })
    };

  } catch (error) {
    console.error("Error general en la función:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Error interno", detalle: error.message })
    };
  }
};
