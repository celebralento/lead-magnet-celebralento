exports.handler = async (event, context) => {
  // Evitamos llamadas que no sean POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método no permitido" };
  }

  try {
    const datos = JSON.parse(event.body);
    const { invitados, tipoEncuentro, tipoComida, energiaHost } = datos;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "Falta la API Key en el servidor" }) };
    }

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

    // URL oficial y directa de la API de Google Gemini (usando el modelo estable)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // Petición nativa directa
    const respuestaApi = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptSistema }] }]
      })
    });

    if (!respuestaApi.ok) {
      const errorTexto = await respuestaApi.text();
      throw new Error(`Error de Google: ${respuestaApi.status} - ${errorTexto}`);
    }

    const dataJson = await respuestaApi.json();
    
    // Extraemos el texto que devuelve Gemini de su estructura estándar
    const textoGenerado = dataJson.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ resultado: textoGenerado }),
    };

  } catch (error) {
    console.error("Error detallado en la función nativa:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Error interno", detalle: error.message }),
    };
  }
};
