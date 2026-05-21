const { GoogleGenAI } = require("@google/genai");

exports.handler = async (event, context) => {
  // Evitamos llamadas que no sean POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método no permitido" };
  }

  try {
    const datos = JSON.parse(event.body);
    const { invitados, tipoEncuentro, tipoComida, energiaHost } = datos;

    // Inicialización explícita con el SDK moderno
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const promptSistema = `
      Actúa como el 'Arquitecto de Experiencias Lentas' de la marca Celebra Lento.
      Tu objetivo es diseñar una hoja de ruta intencional, realista y sin estrés para un anfitrión.
      
      Datos del encuentro:
      - Cantidad de invitados: ${invitados}
      - Tipo de encuentro: ${tipoEncuentro}
      - Tipo de comida: ${tipoComida}
      - Nivel de energía física de la host (1 al 5): ${energiaHost}

      REGLAS CRÍTICAS:
      - Si la energía es baja (1 o 2), ordénale simplificar drásticamente (comprar hecho, grazing table).
      - Si es de 'Conexión profunda', incluye una dinámica de preguntas íntimas basada en Celebra Lento.
      
      Devuelve la respuesta en formato de texto claro y estructurado.
    `;

    // Llamada al modelo con la sintaxis correcta para el nuevo SDK
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [promptSistema],
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ resultado: response.text }),
    };

  } catch (error) {
    console.error("Error en la función:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Error interno", detalle: error.message }),
    };
  }
};
