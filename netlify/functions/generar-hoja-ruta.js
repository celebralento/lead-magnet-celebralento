async function llamarGemini(url, body, maxIntentos = 3) {

  for (let intento = 1; intento <= maxIntentos; intento++) {

    const respuesta = await fetch(url,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify(body)
    });

    if (respuesta.ok){
      return respuesta;
    }

    const errorTexto =
    await respuesta.text();

    if (
      respuesta.status===429 &&
      intento < maxIntentos
    ){

      console.log(
        `Intento ${intento}: demasiato traffico`
      );

      await new Promise(
        r=>setTimeout(r,5000)
      );

      continue;
    }

    throw new Error(
      `Google ${respuesta.status}: ${errorTexto}`
    );

  }

}
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
  const modelos = [
 "gemini-2.5-flash",
 "gemini-1.5-flash"
];

let respuestaApi;

for(const modelo of modelos){

 try{

   const url =
   `https://generativelanguage.googleapis.com/v1/models/${modelo}:generateContent?key=${apiKey}`;

   respuestaApi =
   await llamarGemini(
      url,
      {
        contents:[
         {
          parts:[
           {text:promptSistema}
          ]
         }
        ]
      }
   );

   break;

 } catch(e){

   console.log(
      `falló ${modelo}`
   );

 }

}
    // Petición nativa directa
    const respuestaApi =
async function llamarGemini(url, body, maxIntentos = 5) {

  for (let intento = 1; intento <= maxIntentos; intento++) {

    const respuesta = await fetch(url,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify(body)
    });

    if (respuesta.ok){
      return respuesta;
    }

    const errorTexto =
    await respuesta.text();

    console.log(
      `Intento ${intento}`,
      respuesta.status
    );

    // gestisce quota e saturazione server
    if (
      (respuesta.status===429 ||
       respuesta.status===503) &&
      intento < maxIntentos
    ){

      const espera =
      intento * 5000;

      console.log(
       `Aspetto ${espera}ms`
      );

      await new Promise(
         r=>setTimeout(r,espera)
      );

      continue;
    }

    throw new Error(
      `Google ${respuesta.status}: ${errorTexto}`
    );
  }
}

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
