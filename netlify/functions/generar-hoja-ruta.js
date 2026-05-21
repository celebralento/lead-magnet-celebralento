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

    if(
      (respuesta.status===429 ||
       respuesta.status===503) &&
      intento < maxIntentos
    ){

      const espera =
      intento * 5000;

      await new Promise(
        r=>setTimeout(r,espera)
      );

      continue;
    }

    throw new Error(
      `Google ${respuesta.status}: ${errorTexto}`
    );
  }

  throw new Error(
    "No se pudo conectar con Gemini"
  );
}


exports.handler = async (event, context) => {

  if(event.httpMethod!=="POST"){

    return{
      statusCode:405,
      body:"Método no permitido"
    };

  }

  try{

    const datos=
    JSON.parse(event.body);

    const {
      invitados,
      tipoEncuentro,
      tipoComida,
      energiaHost
    }=datos;

    const apiKey=
    process.env.GEMINI_API_KEY;

    if(!apiKey){

      return{
        statusCode:500,
        body:JSON.stringify({
          error:"Falta API key"
        })
      };

    }

    const promptSistema=`
Actúa como el Arquitecto de Experiencias Lentas de Celebra Lento.

Cantidad invitados:
${invitados}

Tipo encuentro:
${tipoEncuentro}

Tipo comida:
${tipoComida}

Energía:
${energiaHost}

REGLAS:

Si energía=1 o 2:
simplificar drásticamente

Si encuentro=
Conexión profunda:
agrega preguntas íntimas

Respuesta clara y estructurada
- PROHIBIDO usar formato Markdown (no uses asteriscos ** para las negritas ni guiones para las listas).
- Si quieres resaltar un título o una palabra en negrita, usa etiquetas HTML reales como <strong>texto</strong> o <b>texto</b>.
- Para los saltos de línea, usa la etiqueta <br>.
`;

    const modelos=[
      "gemini-2.5-flash"
    ];

    let respuestaApi;

    for(const modelo of modelos){

      try{

        const url=
`https://generativelanguage.googleapis.com/v1/models/${modelo}:generateContent?key=${apiKey}`;

        respuestaApi=
        await llamarGemini(
          url,
          {
            contents:[
              {
                parts:[
                  {
                    text:promptSistema
                  }
                ]
              }
            ]
          }
        );

        console.log(
          `modelo usado: ${modelo}`
        );

        break;

      }

      catch(e){

        console.log(
          `falló ${modelo}`,
          e.message
        );

      }

    }

    if(!respuestaApi){

      throw new Error(
        "Ningún modelo respondió"
      );

    }

    const dataJson=
    await respuestaApi.json();

    const textoGenerado=
      dataJson.candidates?.[0]
      ?.content?.parts?.[0]
      ?.text ||
      "Sin respuesta";

    return{

      statusCode:200,

      headers:{
        "Content-Type":"application/json",
        "Access-Control-Allow-Origin":"*"
      },

      body:JSON.stringify({
        resultado:textoGenerado
      })

    };

  }

  catch(error){

    console.error(
      "Error:",
      error
    );

    return{

      statusCode:500,

      headers:{
        "Content-Type":"application/json"
      },

      body:JSON.stringify({

        error:"Error interno",

        detalle:error.message

      })

    };

  }

};
