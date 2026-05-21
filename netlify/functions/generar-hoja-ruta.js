const { GoogleGenAI } = require("@google/genai");

exports.handler = async (event, context) => {
  // Solo permitimos peticiones POST (cuando el usuario envía el formulario)
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método no permitido" };
  }

  try {
    // 1. Recuperamos las variables que envió el usuario desde la web
    const datos = JSON.parse(event.body);
    const { invitados, tipoEncuentro, tipoComida, energiaHost } = datos;

    // 2. Conectamos con la API de Gemini usando la clave segura del servidor
    // NOTA: La clave se llamará GEMINI_API_KEY en el panel de Netlify
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // 3. Creamos el Prompt del Sistema con tu filosofía de Celebra Lento
    const promptSistema = `
      Actúa como el 'Arquitecto de Experiencias Lentas' de la marca Celebra Lento.
      Tu objetivo es diseñar una hoja de ruta intencional, realista y sin estrés para un anfitrión.
      
      Datos del encuentro:
      - Cantidad de invitados: ${invitados}
      - Tipo de encuentro (ambiente): ${tipoEncuentro}
      - Tipo de comida: ${tipoComida}
      - Nivel de energía física de la host (del 1 al 5): ${energiaHost}

      REGLAS CRÍTICAS DE DIAGNÓSTICO:
      - Si la energía de la host es baja (1 o 2), debes ser EXTREMADAMENTE firme: adviértele que no cometa el error de autoexigirse (como ponerse a hacer pastelería compleja o cocinar platos individuales). Ordénale que compre comida hecha, que delegue o que monte una "Grazing Table" (tabla de quesos/frutas picadas al centro) para que no termine agotada y pueda estar sentada disfrutando.
      - Si el encuentro es de "Conexión profunda", incluye una dinámica basada en preguntas íntimas, escucha activa y la regla de "no juzgar ni dar consejos" (basado en la filosofía de Celebra Lento).
      
      Devuelve la respuesta en formato Markdown claro, empático, con un tono cálido y cercano (pero estructurado).
    `;

    // 4. Hacemos la llamada real al modelo rápido y eficiente
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: promptSistema,
    });

    // 5. Devolvemos la respuesta de Gemini a la página web
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultado: response.text }),
    };

  } catch (error) {
    console.error("Error en la función:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Hubo un error al procesar tu hoja de ruta." }),
    };
  }
};