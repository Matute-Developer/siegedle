/* Situaciones tácticas del modo Partida. Cada una describe un momento real de Siege con
   información OCULTA (nunca HP/posiciones exactas del rival) y 2-4 acciones con trade-offs.
   Campos: id, lado (defensa/ataque), tMin/tMax (ventana de reloj), peso, cond(ctx),
   titulo(ctx), texto(ctx), quiz (prob. 0-1), quizDif, avance [min,max] segundos,
   acciones[]. Acción: id, etiqueta, sub (trade-off visible), riesgo, reqOp[] (ids vivos),
   reqRec (recurso), reqT (tiempo mínimo), base (prob. base 0-1), tags[] (sinergia/counter),
   mods [[texto, pts, cond]], verProb (muestra desglose), qte (segundos, null = sin prisa),
   consume (recurso que gasta), estilo (agresivo/pasivo para la memoria del rival),
   cadena (id de situación siguiente), resulta {crit,ok,parcial,fallo,contra} con {texto,fx}.
   fx: killR/killJ (bajas), dmgR/dmgJ (daño), intel, alerta, tiempo, planta, deny.
   Placeholders: {rival} {aliado} {sitio} {mapa} {spawn} {tiempo}.
   Para agregar contenido: misma forma, sin tocar el motor. */
window.SIEGE_DLE = window.SIEGE_DLE || {};
window.SIEGE_DLE.situacionesTacticas = [
  // ================= DEFENSA =================
  {
    id: "dron-ventana", lado: "defensa", tMin: 120, tMax: 200, peso: 3,
    titulo: () => ["Dron en la ventana", "Ojo electrónico adentro"],
    texto: (ctx) => [`Un dron acaba de colarse por una ventana de ${ctx.sitio}. No sabés quién lo maneja ni qué vio.`,
      `Zumbido en ${ctx.sitio}: entró un dron y está mirando. No sabés cuánto alcanzó a ver.`],
    quiz: 0.15, quizDif: "medio", avance: [8, 14],
    acciones: [
      { id: "romper", etiqueta: "DESTRUIR EL DRON", sub: "Lo rompés, pero el rival confirma gente en la zona.", riesgo: "medio", base: 0.72, tags: ["intel"],
        mods: [["Jammer o utilidad cerca", 8, (c) => c.tiene("mute") || c.tiene("mozzie")], ["Ya te tienen fichado", -10, (c) => c.alerta >= 2]],
        resulta: {
          crit: { texto: "Dron destruido al instante. El rival no llegó a ver nada útil.", fx: { intel: 1 } },
          ok: [{ texto: "Dron destruido. Pero alcanzó a transmitir: el rival sospecha movimiento en el sitio.", fx: { intel: 1, alerta: 1 } },
            { texto: "Lo rompés de un tiro, aunque ya había recorrido media sala.", fx: { intel: 1, alerta: 1 } }],
          parcial: [{ texto: "Le pegás pero escapa roto. Vio a {aliado} de refilón.", fx: { alerta: 1 } },
            { texto: "Lo dejás cojo pero llega a esconderse transmitiendo.", fx: { alerta: 1 } }],
          fallo: [{ texto: "Errás el tiro y el dron se esconde. Ahora saben dónde estás.", fx: { alerta: 1 } },
            { texto: "Fallás y el dron se va intacto con tu posición.", fx: { alerta: 1 } }],
          contra: { texto: "Al romperlo hacés ruido de más: el rival marca tu posición exacta.", fx: { alerta: 2 } } } },
      { id: "ignorar", etiqueta: "IGNORARLO", sub: "Cero riesgo, pero les regalás información.", riesgo: "bajo", base: 0.85, tags: ["intel"], estilo: "pasivo",
        resulta: {
          crit: { texto: "El dron pasa de largo sin ver nada. Punto para la paciencia.", fx: {} },
          ok: [{ texto: "El dron recorre y se va. Probablemente vio algo, pero nada claro.", fx: { alerta: 1 } },
            { texto: "Pasa, mira poco y se va. Información mínima para ellos.", fx: { alerta: 1 } }],
          parcial: [{ texto: "El dron se queda merodeando: alguien va a venir a mirar.", fx: { alerta: 1 } },
            { texto: "Se queda dando vueltas: esa zona va a recibir visita.", fx: { alerta: 1 } }],
          fallo: [{ texto: "El dron te encuentra quieto y transmite tu posición.", fx: { alerta: 2 } },
            { texto: "Te enfoca de lleno: tu posición queda cantada.", fx: { alerta: 2 } }],
          contra: { texto: "Era el dron de Twitch: además de verte, rompe tu utilidad cercana.", fx: { alerta: 2, intel: -1 } } } },
      { id: "rotar", etiqueta: "ROTAR EN SILENCIO", sub: "Cambiás el ángulo, pero dejás la ventana libre.", riesgo: "bajo", base: 0.85, tags: ["rotacion"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Rotás sin hacer ruido y quedás en un ángulo nuevo. El dron mira una sala vacía.", fx: { intel: 1 } },
          ok: [{ texto: "Cambiaste de posición. El dron vio movimiento, pero ya no estás ahí.", fx: {} },
            { texto: "Rotación limpia: el dron mira donde estabas.", fx: {} }],
          parcial: [{ texto: "Rotás tarde: el dron alcanza a ver hacia dónde fuiste.", fx: { alerta: 1 } },
            { texto: "Te movés pero el dron sigue tu dirección.", fx: { alerta: 1 } }],
          fallo: [{ texto: "Hacés ruido al rotar y el dron te sigue. Misma posición, pero avisada.", fx: { alerta: 1 } },
            { texto: "La rotación hace ruido y el dron no te pierde pisada.", fx: { alerta: 1 } }],
          contra: { texto: "Te cruzás con el dron de frente: te ve la cara y la transmite.", fx: { alerta: 2 } } } }
    ]
  },
  {
    id: "c4-pasos", lado: "defensa", tMin: 40, tMax: 160, peso: 3,
    cond: (ctx) => ctx.rec("c4") > 0,
    titulo: () => ["Pasos debajo de la sala", "Alguien abajo, C4 listo"],
    texto: (ctx) => [`Escuchás pasos justo debajo de ${ctx.sitio}. Tenés un C4 preparado en el piso. No sabés si es uno o varios.`,
      `Pisadas bajo ${ctx.sitio} y tu C4 pegado al techo. Pueden ser uno o un grupo entero.`],
    quiz: 0.2, quizDif: "medio", avance: [6, 12],
    acciones: [
      { id: "detonar", etiqueta: "DETONAR EL C4 AHORA", sub: "Ventana inmediata, pero puede que aún no estén en el radio.", riesgo: "alto", reqRec: "c4", consume: "c4", base: 0.55, tags: ["c4"], estilo: "agresivo",
        mods: [["Los escuchás agrupados", 12, (c) => c.intel >= 2], ["Rival desprevenido", 10, (c) => c.alerta === 0], ["El rival ya te leyó el C4", -18, (c) => c.mem.c4 >= 2], ["Mala sincronización", -8, (c) => c.tiempo < 40]],
        verProb: true,
        resulta: {
          crit: { texto: "¡C4 PERFECTO! La explosión se lleva a {rival} y a otro más. Doble baja.", fx: { killR: 2 } },
          ok: { texto: "El C4 vuela en el momento justo: {rival} cae eliminado.", fx: { killR: 1 } },
          parcial: { texto: "La explosión agarra a {rival} de refilón: queda herido y se arrastra fuera.", fx: { dmgR: 60 } },
          fallo: { texto: "Detonás una fracción tarde: polvo y ruido, pero nadie en el radio. C4 gastado.", fx: { utilMal: 1, alerta: 1 } },
          contra: { texto: "El rival escuchó el bip y escapó. Ahora saben que no tenés más C4 en esa zona.", fx: { utilMal: 1, alerta: 2 } } } },
      { id: "esperar", etiqueta: "ESPERAR", sub: "Mejor ventana, pero les das tiempo a dronar.", riesgo: "medio", base: 0.8, tags: ["c4"], estilo: "pasivo", cadena: "c4-ventana",
        resulta: {
          crit: { texto: "Esperás en silencio total. Ahora sí: escuchás a DOS entrando juntos a la zona del C4.", fx: { intel: 1 } },
          ok: { texto: "Aguantás. Los pasos se acercan: uno entra en la habitación del C4.", fx: {} },
          parcial: { texto: "Esperás, pero tiran un dron antes: saben que hay alguien cerca.", fx: { alerta: 1 } },
          fallo: { texto: "Esperás demasiado: cambian de entrada y tu C4 queda mirando una puerta vacía.", fx: {} },
          contra: { texto: "Mientras esperás, te pinchan con un dron y te marcan. El C4 sigue ahí, pero vos estás vendido.", fx: { alerta: 2 } } } },
      { id: "repos", etiqueta: "CAMBIAR DE POSICIÓN", sub: "Asegurás tu vida, pero el C4 queda sin ojos.", riesgo: "bajo", base: 0.88, tags: ["rotacion"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Te movés sin hacer ruido y quedás en crossfire con {aliado}.", fx: {} },
          ok: { texto: "Cambiaste de ángulo. El C4 sigue puesto por si entran.", fx: {} },
          parcial: { texto: "Rotás haciendo algo de ruido: saben que alguien se movió.", fx: { alerta: 1 } },
          fallo: { texto: "Al moverte perdés la referencia del sonido: ya no sabés dónde pisan.", fx: { intel: -1 } },
          contra: { texto: "Te topás con un dron al rotar: te ve y canta tu nueva posición.", fx: { alerta: 2 } } } }
    ]
  },
  {
    id: "c4-ventana", lado: "defensa", tMin: 0, tMax: 200, peso: 0,
    titulo: () => "Ventana de oportunidad",
    texto: () => "Uno entra en la habitación del C4. Tenés UN instante para decidir.",
    quiz: 0, avance: [3, 5],
    acciones: [
      { id: "detonar", etiqueta: "¡DETONAR!", sub: "Ahora o nunca.", riesgo: "alto", reqRec: "c4", consume: "c4", base: 0.66, tags: ["c4"], estilo: "agresivo", qte: 6,
        mods: [["Entró de lleno en el radio", 12, () => true], ["El rival ya te leyó el C4", -18, (c) => c.mem.c4 >= 2]],
        verProb: true,
        resulta: {
          crit: { texto: "¡DETONACIÓN PERFECTA! {rival} vuela por los aires.", fx: { killR: 1 } },
          ok: { texto: "El C4 lo agarra de lleno: {rival} eliminado.", fx: { killR: 1 } },
          parcial: { texto: "Lo agarra a medias: {rival} queda herido y se esconde a curarse.", fx: { dmgR: 55 } },
          fallo: { texto: "Apretás medio segundo tarde: {rival} sale del radio cojeando pero vivo.", fx: { utilMal: 1, dmgR: 20 } },
          contra: { texto: "Era un señuelo con dron: no había nadie y gastaste el C4.", fx: { utilMal: 1, alerta: 1 } } } },
      { id: "nada", etiqueta: "NO HACER NADA", sub: "Guardás el C4 para el plant.", riesgo: "bajo", base: 0.9, tags: ["c4"], estilo: "pasivo",
        resulta: {
          crit: { texto: "No lo gastás y el rival pasa de largo. C4 intacto para el momento clave.", fx: {} },
          ok: { texto: "Guardás el C4. El rival toma un ángulo, pero tu recurso sigue vivo.", fx: {} },
          parcial: { texto: "No detonás y el rival se afianza un poco más en la zona.", fx: { alerta: 1 } },
          fallo: { texto: "Al no hacer nada, el rival se acomoda gratis y te cierra.", fx: { alerta: 1 } },
          contra: { texto: "El que entró te escucha respirar: ahora saben dónde está el C4 y dónde estás vos.", fx: { alerta: 2 } } } }
    ]
  },
  {
    id: "kapkan-boom", lado: "defensa", tMin: 30, tMax: 200, peso: 2,
    cond: (ctx) => ctx.tiene("kapkan") && ctx.rec("edd") > 0,
    titulo: () => "¡EDD activada!",
    texto: (ctx) => `Escuchás la explosión de una trampa de Kapkan en ${ctx.sitio}. Alguien la pisó.`,
    quiz: 0.2, quizDif: "medio", avance: [6, 10],
    acciones: [
      { id: "peek", etiqueta: "PEEK APROVECHANDO", sub: "El rival está aturdido, pero puede haber un segundo.", riesgo: "alto", base: 0.6, tags: ["duelo"], estilo: "agresivo",
        mods: [["Trampa confirmada", 10, () => true], ["El rival ya castiga picks", -10, (c) => c.mem.agresivo >= 3]],
        resulta: {
          crit: { texto: "Salís en el instante exacto: {rival} cae antes de entender qué pasó.", fx: { killR: 1 } },
          ok: { texto: "Aprovechás la confusión y eliminás a {rival}, que venía herido por la trampa.", fx: { killR: 1 } },
          parcial: { texto: "Intercambiás disparos: herís a {rival} pero te obliga a esconderte.", fx: { dmgR: 40, dmgJ: 25 } },
          fallo: { texto: "El que pisó la trampa ya se curó y te estaba esperando. Te obliga a retroceder herido.", fx: { dmgJ: 45 } },
          contra: { texto: "Era bait: el herido era señuelo y su compañero te revienta al asomar.", fx: { dmgJ: 70 } } } },
      { id: "esperar", etiqueta: "ESPERAR", sub: "El herido va a jugar distinto: info gratis.", riesgo: "bajo", base: 0.85, tags: ["intel"], estilo: "pasivo",
        resulta: {
          crit: { texto: "El rival herido se pone nervioso y comete un error de rotación: lo escuchás todo.", fx: { intel: 2 } },
          ok: { texto: "Confirmás un rival herido. Juegan más lento ahora.", fx: { intel: 1 } },
          parcial: { texto: "Se curan en silencio: sabés que hay uno tocado, pero no dónde.", fx: {} },
          fallo: { texto: "Mientras esperás, dronan tu posición.", fx: { alerta: 1 } },
          contra: { texto: "El 'herido' era mentira: fingieron para que te confíes.", fx: { alerta: 1 } } } },
      { id: "rotar", etiqueta: "ROTAR", sub: "Reforzás otro ángulo mientras se curan.", riesgo: "medio", base: 0.8, tags: ["rotacion"],
        resulta: {
          crit: { texto: "Rotás perfecto y armás un crossfire nuevo sin que lo noten.", fx: {} },
          ok: { texto: "Cambiaste de ángulo. El sitio queda igual de cubierto.", fx: {} },
          parcial: { texto: "Rotás con ruido: saben que alguien se movió.", fx: { alerta: 1 } },
          fallo: { texto: "Dejás un hueco al rotar y el rival lo huele.", fx: { alerta: 1 } },
          contra: { texto: "Te encontrás un dron en la rotación: posición nueva, pero cantada.", fx: { alerta: 2 } } } }
    ]
  },
  {
    id: "thermite-muro", lado: "defensa", tMin: 60, tMax: 200, peso: 3,
    cond: (ctx) => ctx.rival("thermite") || ctx.rival("hibana") || ctx.rival("ace"),
    titulo: () => ["Carga en la pared reforzada", "Van a abrir el muro"],
    texto: () => ["Escuchás el pitido de una carga colocándose en la pared reforzada. Van a abrir.",
      "Pared reforzada comprometida: están por volarla. Quedan segundos."],
    quiz: 0.25, quizDif: "experto", avance: [8, 14],
    acciones: [
      { id: "trick", etiqueta: "TRICK ELÉCTRICO", sub: "Si sale, no abren. Si hay Thatcher cubriendo, duele.", riesgo: "alto", reqOp: ["bandit", "kaid"], consume: "bat", base: 0.62, tags: ["breach", "antigadget"], estilo: "agresivo",
        mods: [["Thatcher cubre la carga", -15, (c) => c.rival("thatcher")], ["Doble truco (Bandit + Kaid)", 10, (c) => c.tiene("bandit") && c.tiene("kaid")]],
        verProb: true,
        resulta: {
          crit: { texto: "¡TRICK PERFECTO! La carga se quema y la pared sigue intacta. El rival no tiene plan B.", fx: { intel: 1 } },
          ok: { texto: "La batería quema la carga. Van a tener que gastar otra o cambiar de entrada.", fx: { tiempo: -10 } },
          parcial: { texto: "Quemas la carga pero te ven la mano: saben quién hizo el trick.", fx: { alerta: 1 } },
          fallo: { texto: "Llegás tarde por medio segundo: la pared se abre igual y gastaste la batería.", fx: { utilMal: 1 } },
          contra: { texto: "Thatcher te leyó: PEM primero y la pared se abre con tu batería quemada.", fx: { utilMal: 1, alerta: 1 } } } },
      { id: "c4muro", etiqueta: "ROMPER CON C4", sub: "Vuela la carga y quizás al que la puso.", riesgo: "alto", reqRec: "c4", consume: "c4", base: 0.5, tags: ["c4"], estilo: "agresivo",
        mods: [["Pared identificada", 8, (c) => c.intel >= 1]],
        resulta: {
          crit: { texto: "El C4 vuela la carga Y al que la puso: {rival} eliminado.", fx: { killR: 1 } },
          ok: { texto: "La carga sale volando. Pared a salvo, por ahora.", fx: {} },
          parcial: { texto: "Rompés la carga pero el estruendo te deja sordo unos segundos.", fx: { intel: -1 } },
          fallo: { texto: "El C4 no alcanza la carga: explosión al pedo y recurso gastado.", fx: { utilMal: 1 } },
          contra: { texto: "Te escucharon preparar el C4 y te pre-foguean la posición.", fx: { utilMal: 1, dmgJ: 40 } } } },
      { id: "aguantar", etiqueta: "AGUANTAR", sub: "Que abran: los recibís del otro lado.", riesgo: "bajo", base: 0.85, tags: ["ancla"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Abren y entran confiados directo a tu mira. Lectura perfecta.", fx: { intel: 1 } },
          ok: { texto: "La pared se abre, pero ya tenés el ángulo tomado.", fx: {} },
          parcial: { texto: "Abren por donde no esperabas: tenés que reajustar ángulos.", fx: { alerta: 1 } },
          fallo: { texto: "Abren dos paredes a la vez y el sitio queda muy expuesto.", fx: { alerta: 1 } },
          contra: { texto: "Con la pared abierta te llueven flashes y perdés el ángulo.", fx: { dmgJ: 30 } } } }
    ]
  },
  {
    id: "plant-enemigo", lado: "defensa", tMin: 0, tMax: 55, peso: 4,
    titulo: () => ["¡ESTÁN PLANTANDO!", "Defuser en el piso"],
    texto: (ctx) => [`Escuchás el pitido del defuser en ${ctx.sitio}. Quedan {tiempo} en el reloj.`,
      `El defuser suena en ${ctx.sitio}: lo están plantando con {tiempo} en el reloj.`],
    quiz: 0, avance: [5, 8],
    acciones: [
      { id: "peek", etiqueta: "PEEK AL PLANT", sub: "Si lo cortás, se acabó. Si fallás, te tradean.", riesgo: "alto", base: 0.5, tags: ["duelo"], estilo: "agresivo", qte: 8,
        mods: [["Sabés dónde planta", 10, (c) => c.intel >= 2], ["Sin margen de reloj", 5, (c) => c.tiempo < 20]],
        verProb: true,
        resulta: {
          crit: { texto: "¡PLANT NEGADO! {rival} cae con el defuser en la mano.", fx: { killR: 1, deny: true } },
          ok: { texto: "Lo cortás a tiempo: el plant se cancela y tienen que reintentar.", fx: { deny: true } },
          parcial: { texto: "Lo herís pero alcanza a plantar igual. Ahora es retake.", fx: { dmgR: 50, planta: true } },
          fallo: { texto: "Asomás y el que cubre te frena. Plantan tranquilos.", fx: { dmgJ: 40, planta: true } },
          contra: { texto: "Era fake: picó el plant para sacarte y te elimina el que cubría.", fx: { dmgJ: 80, planta: true } } } },
      { id: "utilidad", etiqueta: "NEGAR CON UTILIDAD", sub: "Gas o truco desde lejos, sin dar la cara.", riesgo: "medio", reqOp: ["smoke", "goyo", "melusi", "echo", "maestro"], base: 0.62, tags: ["deny"], estilo: "pasivo",
        mods: [["Smoke con gas guardado", 10, (c) => c.tiene("smoke") && c.rec("gas") > 0], ["Echo con Yokai", 8, (c) => c.tiene("echo")]],
        resulta: {
          crit: { texto: "Utilidad perfecta: el plant se cancela y encima {rival} queda tocado.", fx: { deny: true, dmgR: 30 } },
          ok: { texto: "La utilidad lo saca del plant. Tienen que volver a intentar.", fx: { deny: true } },
          parcial: { texto: "Lo molestás pero planta igual entre el humo. Retake.", fx: { planta: true } },
          fallo: { texto: "La utilidad cae mal y no molesta a nadie. Recurso gastado.", fx: { utilMal: 1, planta: true } },
          contra: { texto: "Gastás la utilidad y el rival la rompe antes: plant limpio para ellos.", fx: { utilMal: 1, planta: true } } } },
      { id: "tiempo", etiqueta: "JUGAR EL TIEMPO", sub: "Esconderse y salir al último segundo.", riesgo: "medio", base: 0.55, tags: ["reloj"], estilo: "pasivo",
        mods: [["Quedan menos de 20 segundos", 15, (c) => c.tiempo < 20], ["El rival juega tranquilo", -10, (c) => c.alerta >= 2]],
        resulta: {
          crit: { texto: "Salís en el último segundo posible: no les da el reloj ni para reaccionar.", fx: { killR: 1, deny: true } },
          ok: { texto: "El reloj los apura y fuerzan un plant malo que cortás.", fx: { deny: true } },
          parcial: { texto: "Plantan igual pero sin tiempo para acomodarse: retake favorable.", fx: { planta: true } },
          fallo: { texto: "Calculás mal y salís tarde: plantan cómodos.", fx: { planta: true } },
          contra: { texto: "Te encuentran escondido antes del plant: te sacan gratis.", fx: { dmgJ: 90, planta: true } } } }
    ]
  },
  {
    id: "cam-ash", lado: "defensa", tMin: 60, tMax: 200, peso: 2,
    cond: (ctx) => ctx.rec("cam") > 0,
    titulo: () => "Movimiento en cámaras",
    texto: () => "Por cámaras ves a alguien acercándose por el pasillo. Va solo, por ahora.",
    quiz: 0.15, quizDif: "medio", avance: [8, 12],
    acciones: [
      { id: "marcar", etiqueta: "MARCAR Y AVISAR", sub: "Todo el equipo lo sabe. Cero riesgo.", riesgo: "bajo", base: 0.9, tags: ["intel"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Ping perfecto: tu equipo ya lo está esperando en dos ángulos.", fx: { intel: 2 } },
          ok: { texto: "Información transmitida: saben por dónde viene.", fx: { intel: 2 } },
          parcial: { texto: "Lo marcás, pero rompe la cámara al segundo.", fx: { intel: 1 } },
          fallo: { texto: "Mirando la cámara te distraés y perdés tu propio ángulo.", fx: { alerta: 1 } },
          contra: { texto: "Era un señuelo mirando la cámara: el verdadero avance viene por otro lado.", fx: { alerta: 1 } } } },
      { id: "cortar", etiqueta: "ROTAR A CORTARLO", sub: "Lo agarrás de costado, pero dejás tu zona.", riesgo: "medio", base: 0.62, tags: ["duelo", "rotacion"], estilo: "agresivo",
        resulta: {
          crit: { texto: "Le caés por la espalda: {rival} no entiende de dónde le disparan.", fx: { killR: 1 } },
          ok: { texto: "Lo cortás en la rotación: {rival} eliminado.", fx: { killR: 1 } },
          parcial: { texto: "Intercambiás: lo dejás herido pero te hace retroceder.", fx: { dmgR: 50, dmgJ: 30 } },
          fallo: { texto: "Cuando llegás ya pasó, y tu zona quedó regalada.", fx: { alerta: 1 } },
          contra: { texto: "Te estaba esperando con dron: te recibe con balas.", fx: { dmgJ: 60 } } } },
      { id: "ignorar", etiqueta: "IGNORAR", sub: "Ahorrás tiempo, pero entra gratis.", riesgo: "bajo", base: 0.7, tags: ["intel"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Resulta ser un dron con skin... no, era un dron de verdad. Pero se va solo.", fx: {} },
          ok: { texto: "Pasa de largo sin ver nada importante.", fx: {} },
          parcial: { texto: "Entra y se afianza: ahora hay uno adentro.", fx: { alerta: 1 } },
          fallo: { texto: "No era uno solo: entran dos por ese pasillo.", fx: { alerta: 2 } },
          contra: { texto: "Mientras lo ignorás, planta un dron y te marca a vos.", fx: { alerta: 2 } } } }
    ]
  },
  {
    id: "iq-scan", lado: "defensa", tMin: 50, tMax: 200, peso: 2,
    cond: (ctx) => ctx.rival("iq"),
    titulo: () => ["IQ está escaneando", "Barrido electrónico"],
    texto: () => ["Escuchás el escáner de IQ barriendo la zona: está buscando tus dispositivos.",
      "El escáner de IQ pasa por tus gadgets: si encuentra algo, lo canta."],
    quiz: 0.2, quizDif: "medio", avance: [8, 12],
    acciones: [
      { id: "apagar", etiqueta: "APAGAR TODO", sub: "Vigil o Mute la dejan ciega, pero perdés presencia.", riesgo: "medio", reqOp: ["vigil", "mute", "mozzie", "solis"], base: 0.68, tags: ["antigadget"],
        mods: [["Vigil con ERC disponible", 8, (c) => c.tiene("vigil")]],
        resulta: {
          crit: { texto: "La dejás completamente ciega: su escáner no encuentra nada y el equipo rival duda.", fx: { intel: 1 } },
          ok: [{ texto: "Apagás y escondés lo importante. IQ se va con las manos vacías.", fx: {} },
            { texto: "Todo apagado a tiempo: el escáner barre una zona muerta.", fx: {} }],
          parcial: [{ texto: "Escondés la mitad: encuentra algo menor pero no lo clave.", fx: { alerta: 1 } },
            { texto: "Apagás tarde lo importante: marca un gadget secundario.", fx: { alerta: 1 } }],
          fallo: [{ texto: "Tardás en apagar: ya marcó tus posiciones.", fx: { alerta: 2 } },
            { texto: "El escáner completa el barrido antes de que apagues.", fx: { alerta: 2 } }],
          contra: { texto: "Al moverte para apagar, te ve a vos en persona.", fx: { alerta: 2 } } } },
      { id: "repos", etiqueta: "REPOSICIONAR", sub: "Te movés vos en vez de la utilidad.", riesgo: "bajo", base: 0.85, tags: ["rotacion"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Te movés justo a tiempo: escanea una sala vacía.", fx: {} },
          ok: [{ texto: "Cambiaste de lugar. Lo que marcó ya no sirve.", fx: {} },
            { texto: "Nueva posición: su escaneo quedó viejo.", fx: {} }],
          parcial: [{ texto: "Te movés pero tus gadgets quedan marcados.", fx: { alerta: 1 } },
            { texto: "Vos zafás, pero tu utilidad queda fichada.", fx: { alerta: 1 } }],
          fallo: [{ texto: "Te ve moviéndote en vivo.", fx: { alerta: 1 } },
            { texto: "Te agarra en plena rotación.", fx: { alerta: 1 } }],
          contra: { texto: "Te movés directo hacia donde miraba: información gratis para ella.", fx: { alerta: 2 } } } },
      { id: "aguantar", etiqueta: "AGUANTAR", sub: "Que escanee: tus balas no necesitan gadgets.", riesgo: "medio", base: 0.75, tags: ["ancla"],
        resulta: {
          crit: { texto: "Escanea todo y aun así entra confiada a tu mira.", fx: { intel: 1 } },
          ok: [{ texto: "Encuentra tus gadgets pero no tus posiciones. Ventaja tuya.", fx: {} },
            { texto: "Sabe qué tenés, pero no dónde estás.", fx: {} }],
          parcial: [{ texto: "Marca tu utilidad clave y el rival la rompe desde lejos.", fx: { alerta: 1 } },
            { texto: "Pierde un gadget importante por el escaneo.", fx: { alerta: 1 } }],
          fallo: [{ texto: "Con toda la info, el rival ejecuta perfecto sobre tu zona.", fx: { alerta: 2 } },
            { texto: "Ejecutan sobre seguro con tu posición marcada.", fx: { alerta: 2 } }],
          contra: { texto: "IQ no solo escanea: te pincha la posición y te cae una frag.", fx: { dmgJ: 50 } } } }
    ]
  },
  {
    id: "dok-hack", lado: "defensa", tMin: 40, tMax: 200, peso: 2,
    cond: (ctx) => ctx.rival("dokkaebi"),
    titulo: () => ["Hackeo de Dokkaebi", "Teléfonos intervenidos"],
    texto: () => ["Tu teléfono vibra: Dokkaebi hackeó las líneas. Si suena, te ubican.",
      "Llamada entrante hackeada: si atiende alguien, cantan posiciones."],
    quiz: 0.2, quizDif: "medio", avance: [8, 12],
    acciones: [
      { id: "romper", etiqueta: "ROMPER LOS TELÉFONOS", sub: "Silencio total, pero perdés llamadas de info.", riesgo: "bajo", base: 0.88, tags: ["antigadget"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Teléfonos rotos en todo el equipo al mismo tiempo. El hackeo muere en silencio.", fx: {} },
          ok: { texto: "Rompés el tuyo y avisás: el equipo queda en silencio.", fx: {} },
          parcial: { texto: "Rompés el tuyo pero alguien tarda: lo ubican a él.", fx: { alerta: 1 } },
          fallo: { texto: "Tardás en reaccionar y suena igual. Te ubican.", fx: { alerta: 2 } },
          contra: { texto: "Al romperlo hacés ruido justo cuando pasaban: doble regalo.", fx: { alerta: 2 } } } },
      { id: "rotar", etiqueta: "ROTAR ANTES DEL SONIDO", sub: "Te movés y el ping queda viejo.", riesgo: "medio", base: 0.7, tags: ["rotacion"],
        resulta: {
          crit: { texto: "Rotás en silencio y el ping marca una sala vacía. Información falsa para ellos.", fx: { intel: 1 } },
          ok: { texto: "Te moviste a tiempo: suenan los teléfonos pero ya no estás ahí.", fx: {} },
          parcial: { texto: "Te movés pero con ruido: saben la dirección.", fx: { alerta: 1 } },
          fallo: { texto: "Suena antes de que termines de rotar: te marcan en movimiento.", fx: { alerta: 2 } },
          contra: { texto: "Rotás directo a donde miraban: te reciben.", fx: { dmgJ: 45 } } } },
      { id: "igual", etiqueta: "SEGUIR IGUAL", sub: "Apostás a que no te van a buscar.", riesgo: "alto", base: 0.55, tags: ["ancla"], estilo: "agresivo",
        resulta: {
          crit: { texto: "Suenan los teléfonos y nadie viene: el rival no se anima a entrar.", fx: {} },
          ok: { texto: "Te ubican pero no ejecutan sobre vos. Quedás avisado.", fx: { alerta: 1 } },
          parcial: { texto: "Te ubican y cae utilidad sobre tu zona.", fx: { dmgJ: 25, alerta: 1 } },
          fallo: { texto: "Con tu posición cantada, te aíslan y te sacan.", fx: { dmgJ: 70 } },
          contra: { texto: "Te ubican, te aíslan y te cazan entre dos.", fx: { killJ: 1 } } } }
    ]
  },
  {
    id: "agrupados-fuera", lado: "defensa", tMin: 50, tMax: 170, peso: 2,
    cond: (ctx) => ctx.intel >= 2,
    titulo: () => "Agrupados afuera",
    texto: (ctx) => `Tenés info sólida: dos o tres rivales agrupados cerca de la entrada de ${ctx.sitio}.`,
    quiz: 0.15, quizDif: "medio", avance: [8, 12],
    acciones: [
      { id: "c4grupo", etiqueta: "C4 AL GRUPO", sub: "Si están juntos, duele. Si se separaron, se pierde.", riesgo: "alto", reqRec: "c4", consume: "c4", base: 0.58, tags: ["c4"], estilo: "agresivo",
        mods: [["Info sólida del grupo", 10, (c) => c.intel >= 2], ["El rival ya te leyó el C4", -18, (c) => c.mem.c4 >= 2]],
        verProb: true,
        resulta: {
          crit: { texto: "¡C4 DOBLE! El grupo entero desaparece en la explosión.", fx: { killR: 2 } },
          ok: { texto: "El C4 agarra al grupo: {rival} eliminado y otro herido.", fx: { killR: 1, dmgR: 40 } },
          parcial: { texto: "Solo agarrás a uno de refilón: {rival} herido.", fx: { dmgR: 55 } },
          fallo: { texto: "Se separaron un segundo antes: explosión al aire.", fx: { utilMal: 1 } },
          contra: { texto: "Te escucharon preparar y te devuelven el favor con utilidad.", fx: { utilMal: 1, dmgJ: 45 } } } },
      { id: "gas", etiqueta: "GAS DE SMOKE", sub: "Los separás sin gastar el C4.", riesgo: "medio", reqOp: ["smoke"], consume: "gas", base: 0.7, tags: ["deny"],
        resulta: {
          crit: { texto: "El gas cae perfecto: se separan tosiendo y {aliado} pesca a {rival}.", fx: { killR: 1 } },
          ok: { texto: "El gas los obliga a abrirse. Grupo desarmado.", fx: { tiempo: -10 } },
          parcial: { texto: "El gas molesta pero pasan igual por un costado.", fx: {} },
          fallo: { texto: "El gas cae mal y no corta a nadie. Granada gastada.", fx: { utilMal: 1 } },
          contra: { texto: "Tiran el gas para atrás con un impacto: tu propia nube te ciega.", fx: { utilMal: 1, alerta: 1 } } } },
      { id: "dejar", etiqueta: "DEJARLOS PASAR", sub: "Que entren: el retake con info es tuyo.", riesgo: "medio", base: 0.72, tags: ["retake"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Entran confiados a una trampa armada: los recibís de dos ángulos.", fx: { killR: 1, intel: 1 } },
          ok: { texto: "Los dejás entrar sabiendo por dónde: el retake queda servido.", fx: { intel: 1 } },
          parcial: { texto: "Entran y se afianzan más de lo esperado.", fx: { alerta: 1 } },
          fallo: { texto: "Entran y plantan antes de que armes el retake.", fx: { planta: true } },
          contra: { texto: "Mientras los dejás pasar, te cortan la rotación por la espalda.", fx: { dmgJ: 55 } } } }
    ]
  },
  {
    id: "eco-pasillos", lado: "defensa", tMin: 40, tMax: 200, peso: 2,
    titulo: () => ["Eco en los pasillos", "Ruido sin dueño"],
    texto: (ctx) => [`Se escucha movimiento en los pasillos de ${ctx.sitio}, pero sin ver nada. Puede ser uno solo o la entrada completa.`,
      `Pasos y murmullos cerca de ${ctx.sitio}. Algo se mueve, pero no sabés qué ni cuántos son.`],
    quiz: 0.1, quizDif: "medio", avance: [8, 12],
    acciones: [
      { id: "escuchar", etiqueta: "ESCUCHAR QUIETO", sub: "El oído afina solo si no te movés.", riesgo: "bajo", base: 0.8, tags: ["intel"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Escuchás todo: cantidad, dirección y hasta el operador por los pasos.", fx: { intel: 2 } },
          ok: { texto: "Identificás por dónde vienen y cuántos son aprox.", fx: { intel: 1 } },
          parcial: { texto: "Escuchás algo, pero el eco te confunde la dirección.", fx: {} },
          fallo: { texto: "Mientras escuchás, te dronan la posición.", fx: { alerta: 1 } },
          contra: { texto: "El ruido era un señuelo: mientras escuchabas, entraron por otro lado.", fx: { alerta: 2 } } } },
      { id: "picar", etiqueta: "PICAR EL SONIDO", sub: "Salir a buscar al que hace ruido.", riesgo: "medio", base: 0.6, tags: ["duelo"], estilo: "agresivo",
        resulta: {
          crit: { texto: "Lo agarrás desprevenido haciendo ruido: {rival} eliminado.", fx: { killR: 1 } },
          ok: { texto: "Encontrás al que hacía ruido: {rival} eliminado.", fx: { killR: 1 } },
          parcial: { texto: "Intercambiás con el que hacía ruido.", fx: { dmgR: 45, dmgJ: 35 } },
          fallo: { texto: "El del ruido tenía compañía: te reciben entre dos.", fx: { dmgJ: 60 } },
          contra: { texto: "Saliste a un ruido armado: era una emboscada.", fx: { killJ: 1 } } } },
      { id: "camara", etiqueta: "REVISAR CÁMARAS", sub: "Confirmar con ojos antes de moverte.", riesgo: "bajo", base: 0.75, tags: ["intel"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Cámara perfecta: los contás a todos y sabés el plan.", fx: { intel: 2 } },
          ok: { texto: "Las cámaras confirman movimiento en una zona.", fx: { intel: 1 } },
          parcial: { texto: "Las cámaras están rotas en esa zona: solo audio.", fx: {} },
          fallo: { texto: "Mirando cámaras perdés tu ángulo unos segundos clave.", fx: { alerta: 1 } },
          contra: { texto: "Mientras mirás cámaras, te entran por tu propio ángulo.", fx: { dmgJ: 50 } } } }
    ]
  },
  {
    id: "camara-rota", lado: "defensa", tMin: 30, tMax: 200, peso: 2,
    titulo: () => ["Cámara destruida", "Nos quedamos ciegos ahí"],
    texto: (ctx) => [`Acaban de romper una cámara cerca de ${ctx.sitio}. Alguien está trabajando esa zona.`,
      `Se apagó una cámara: la rompieron a propósito. Esa entrada quedó sin ojos.`],
    quiz: 0.1, quizDif: "medio", avance: [8, 12],
    acciones: [
      { id: "cubrir", etiqueta: "ROTAR A CUBRIR", sub: "Tapar el hueco con un cuerpo.", riesgo: "medio", base: 0.68, tags: ["rotacion"],
        resulta: {
          crit: { texto: "Llegás justo y agarrás al que rompía entrando: {rival} eliminado.", fx: { killR: 1 } },
          ok: { texto: "El hueco queda cubierto con balas en vez de cámara.", fx: {} },
          parcial: { texto: "Cubrís pero dejás tu zona anterior floja.", fx: { alerta: 1 } },
          fallo: { texto: "Llegás tarde: ya pasaron por ahí.", fx: { alerta: 1 } },
          contra: { texto: "El que rompía te esperaba cubriendo la rotación.", fx: { dmgJ: 55 } } } },
      { id: "hueco", etiqueta: "DEJAR EL HUECO", sub: "Que entren: los esperás del otro lado.", riesgo: "bajo", base: 0.8, tags: ["trampa"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Entran confiados al hueco y caen en tu crossfire.", fx: { killR: 1 } },
          ok: { texto: "El hueco es una trampa: los recibís avisado.", fx: { intel: 1 } },
          parcial: { texto: "Entran con cuidado y no pican la trampa.", fx: {} },
          fallo: { texto: "El hueco era más grande de lo que creías: se meten dos.", fx: { alerta: 1 } },
          contra: { texto: "Mientras mirás el hueco, entran por otro lado.", fx: { alerta: 2 } } } },
      { id: "buscar", etiqueta: "BUSCAR AL QUE ROMPIÓ", sub: "Está cerca y distraído.", riesgo: "alto", base: 0.52, tags: ["duelo"], estilo: "agresivo",
        resulta: {
          crit: { texto: "Lo encontrás rompiendo y lo sacás gratis: {rival} eliminado.", fx: { killR: 1 } },
          ok: { texto: "Lo cazás antes de que se acomode: {rival} eliminado.", fx: { killR: 1 } },
          parcial: { texto: "Lo encontrás pero ya está en posición: intercambio parejo.", fx: { dmgR: 40, dmgJ: 40 } },
          fallo: { texto: "Rompió y se fue: lo buscás donde ya no está.", fx: { alerta: 1 } },
          contra: { texto: "Rompía acompañado: te recibe el compañero.", fx: { killJ: 1 } } } }
    ]
  },
  {
    id: "rival-gasta", lado: "defensa", tMin: 80, tMax: 200, peso: 2,
    cond: (ctx) => ctx.intel >= 1,
    titulo: () => ["Gastan utilidad temprano", "Se apuran"],
    texto: () => ["El rival está gastando utilidad muy temprano: flashes, drones, de todo. Quieren entrar ya.",
      "Lluvia de utilidad rival antes de tiempo: están apurados o nerviosos."],
    quiz: 0.1, quizDif: "medio", avance: [8, 12],
    acciones: [
      { id: "castigar", etiqueta: "CASTIGAR AHORA", sub: "Apurados cometen errores.", riesgo: "alto", base: 0.58, tags: ["duelo"], estilo: "agresivo",
        mods: [["Van apurados", 8, () => true]],
        resulta: {
          crit: { texto: "Salís en el caos y pescás a {rival} con la granada en la mano.", fx: { killR: 1 } },
          ok: { texto: "Aprovechás el apuro: {rival} eliminado.", fx: { killR: 1 } },
          parcial: { texto: "Los apurás más todavía, pero sin bajas.", fx: { alerta: 1 } },
          fallo: { texto: "El apuro era un bait para sacarte.", fx: { dmgJ: 55 } },
          contra: { texto: "Salís al caos y te comés toda la utilidad junta.", fx: { dmgJ: 75 } } } },
      { id: "anotar", etiqueta: "ANOTAR Y ESPERAR", sub: "Que gasten: después no tienen nada.", riesgo: "bajo", base: 0.85, tags: ["intel"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Gastan todo y no entran: los contás sin nada en los bolsillos.", fx: { intel: 2 } },
          ok: { texto: "Dejás que se vacíen: cada cosa que tiran es una menos para el plant.", fx: { intel: 1 } },
          parcial: { texto: "Gastan bastante, pero guardan lo importante.", fx: {} },
          fallo: { texto: "Mientras anotás, se acomodan gratis.", fx: { alerta: 1 } },
          contra: { texto: "El 'gasto' era para fijarte mientras rotaban por otro lado.", fx: { alerta: 2 } } } },
      { id: "rotar", etiqueta: "ROTAR LEJOS DEL RUIDO", sub: "Que gasten donde ya no estás.", riesgo: "medio", base: 0.75, tags: ["rotacion"],
        resulta: {
          crit: { texto: "Rotás perfecto: gastan todo en una zona vacía.", fx: {} },
          ok: { texto: "Te movés y su utilidad cae al aire.", fx: {} },
          parcial: { texto: "Rotás con ruido: saben que te moviste.", fx: { alerta: 1 } },
          fallo: { texto: "Rotás directo a donde tiraban la utilidad.", fx: { dmgJ: 40 } },
          contra: { texto: "Te esperan en la rotación.", fx: { dmgJ: 60 } } } }
    ]
  },
  {
    id: "clutch-def", lado: "defensa", tMin: 0, tMax: 200, peso: 0,
    cond: (ctx) => ctx.vivosJ === 1 && ctx.vivosR >= 2,
    titulo: () => "CLUTCH: 1 VS RESTO",
    texto: (ctx) => `Quedás solo contra ${ctx.vivosR}. Quedan {tiempo} en el reloj. Todo depende de vos.`,
    quiz: 0, avance: [5, 8],
    acciones: [
      { id: "oír", etiqueta: "JUGAR AL SONIDO", sub: "Paciencia y oído: un error de ellos y es tuyo.", riesgo: "medio", base: 0.55, tags: ["clutch"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Escuchás todo: los agarrás separados y el clutch empieza a oler a hazaña.", fx: { killR: 1 } },
          ok: { texto: "El sonido te regala el primero: {rival} eliminado.", fx: { killR: 1 } },
          parcial: { texto: "Herís a uno pero te ubican a vos también.", fx: { dmgR: 60, alerta: 2 } },
          fallo: { texto: "Esperás y te cierran de a dos sin darte chances.", fx: { dmgJ: 60 } },
          contra: { texto: "Te leen la paciencia y te rushean juntos.", fx: { killJ: 1 } } } },
      { id: "peek", etiqueta: "PEEK SECO", sub: "Todo o nada en un duelo.", riesgo: "alto", base: 0.45, tags: ["clutch", "duelo"], estilo: "agresivo",
        resulta: {
          crit: { texto: "¡QUÉ PEEK! {rival} cae sin verla venir y el otro se esconde.", fx: { killR: 1 } },
          ok: { texto: "Ganás el duelo: {rival} eliminado. Queda menos.", fx: { killR: 1 } },
          parcial: { texto: "Intercambiás: lo dejás herido pero quedás tocado.", fx: { dmgR: 70, dmgJ: 50 } },
          fallo: { texto: "Perdés el duelo limpiamente.", fx: { dmgJ: 80 } },
          contra: { texto: "El peek era una trampa: te estaban esperando dos miras.", fx: { killJ: 1 } } } },
      { id: "c4final", etiqueta: "C4 FINAL", sub: "Tu último recurso, si lo tenés.", riesgo: "alto", reqRec: "c4", consume: "c4", base: 0.6, tags: ["clutch", "c4"], estilo: "agresivo",
        resulta: {
          crit: { texto: "¡C4 CLUTCH! La ronda se da vuelta con una explosión.", fx: { killR: 1 } },
          ok: { texto: "El C4 encuentra a {rival}: eliminado.", fx: { killR: 1 } },
          parcial: { texto: "Lo dejás herido pero sigue en pie.", fx: { dmgR: 65 } },
          fallo: { texto: "El C4 no agarra a nadie. Te quedaste sin nada.", fx: { utilMal: 1 } },
          contra: { texto: "Escuchan el C4 y te cazan mientras lo preparás.", fx: { killJ: 1 } } } }
    ]
  },
  {
    id: "fuego-distancia", lado: "defensa", tMin: 0, tMax: 200, peso: 1,
    titulo: () => "Intercambio a distancia",
    texto: (ctx) => `Disparos esporádicos cruzando ${ctx.sitio}. Nadie confirma nada todavía: es ruido y presión.`,
    quiz: 0, avance: [8, 14],
    acciones: [
      { id: "peek", etiqueta: "DEVOLVER EL PEEK", sub: "Alguien tiene que ganar ese ángulo.", riesgo: "medio", base: 0.55, tags: ["duelo"], estilo: "agresivo",
        mods: [["Tenés info del otro lado", 8, (c) => c.intel >= 2]],
        resulta: {
          crit: { texto: "Peek perfecto: {rival} cae antes de esconderse.", fx: { killR: 1 } },
          ok: [{ texto: "Ganás el intercambio: {rival} eliminado.", fx: { killR: 1 } },
            { texto: "Lo agarrás recargando: {rival} eliminado.", fx: { killR: 1 } }],
          parcial: [{ texto: "Intercambiás daño parejo y cada uno vuelve a su ángulo.", fx: { dmgR: 35, dmgJ: 35 } },
            { texto: "Lo tocás pero te responden: ambos heridos.", fx: { dmgR: 40, dmgJ: 30 } }],
          fallo: [{ texto: "Perdés el peek y tenés que esconderte a curarte.", fx: { dmgJ: 50 } },
            { texto: "El rival te gana el ángulo limpio.", fx: { dmgJ: 55 } }],
          contra: { texto: "El intercambio era una trampa: te tradean al asomar.", fx: { killJ: 1 } } } },
      { id: "rafaga", etiqueta: "RÁFAGA DE COBERTURA", sub: "Gastás balas para frenar el avance.", riesgo: "bajo", base: 0.8, tags: ["deny"], estilo: "pasivo",
        resulta: {
          crit: { texto: "La ráfaga los clava al piso y {aliado} aprovecha para marcar todo.", fx: { intel: 1, tiempo: -8 } },
          ok: [{ texto: "El fuego de cobertura frena el avance rival unos segundos.", fx: { tiempo: -8 } },
            { texto: "Los obligás a agacharse: ganás tiempo sin regalar nada.", fx: { tiempo: -8 } }],
          parcial: [{ texto: "Frenan a medias: avanzan igual pero más lento.", fx: { tiempo: -5 } },
            { texto: "Gastás muchas balas para poco efecto.", fx: {} }],
          fallo: [{ texto: "La ráfaga no frena a nadie y delatás tu posición.", fx: { alerta: 1 } },
            { texto: "Disparás al aire: ruido gratis para el rival.", fx: { alerta: 1 } }],
          contra: { texto: "Mientras cubrís, te flanquean por el ruido.", fx: { dmgJ: 45 } } } },
      { id: "angulo", etiqueta: "AGUANTAR EL ÁNGULO", sub: "Quietud total hasta que asomen.", riesgo: "bajo", base: 0.85, tags: ["ancla"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Paciencia total: el primero que asoma se lleva tus balas.", fx: { killR: 1 } },
          ok: [{ texto: "Aguantás perfecto: el rival no se anima a picar.", fx: {} },
            { texto: "Ni se mueven: tu ángulo manda en la zona.", fx: {} }],
          parcial: [{ texto: "Te tiran utilidad para sacarte del ángulo.", fx: { dmgJ: 20 } },
            { texto: "Te obligan a moverte con presión.", fx: { alerta: 1 } }],
          fallo: [{ texto: "Te duermen el ángulo con paciencia y te lo quitan.", fx: { alerta: 1 } },
            { texto: "Aguantás tanto que el rival rota gratis por otro lado.", fx: { alerta: 1 } }],
          contra: { texto: "Te encuentran quieto y te caen con todo.", fx: { dmgJ: 60 } } } }
    ]
  },
  {
    id: "retake-def", lado: "defensa", tMin: 0, tMax: 60, peso: 0,
    cond: (ctx) => ctx.plantado,
    titulo: () => "RETAKE: defuser activo",
    texto: () => "El defuser está plantado y sonando. Tenés que entrar y desactivar.",
    quiz: 0, avance: [5, 8],
    acciones: [
      { id: "juntos", etiqueta: "ENTRAR JUNTOS", sub: "Tradeo asegurado si van pegados.", riesgo: "medio", base: 0.6, tags: ["retake"], estilo: "agresivo",
        resulta: {
          crit: { texto: "Entran como un equipo: limpian todo sin bajas.", fx: { killR: 1 } },
          ok: { texto: "El tradeo funciona: {rival} cae y tocan el defuser.", fx: { killR: 1 } },
          parcial: { texto: "Intercambian uno por uno en la entrada.", fx: { killR: 1, killJ: 1 } },
          fallo: { texto: "Entran desordenados y los separan.", fx: { killJ: 1 } },
          contra: { texto: "El que cubre los mata en fila al entrar.", fx: { killJ: 2 } } } },
      { id: "aislar", etiqueta: "AISLAR 1V1", sub: "Si separás los duelos, ganás.", riesgo: "alto", base: 0.5, tags: ["retake", "duelo"], estilo: "agresivo",
        resulta: {
          crit: { texto: "Los agarrás de a uno: dos duelos, dos bajas.", fx: { killR: 2 } },
          ok: { texto: "Aislás a {rival} y lo ganás. El resto tiembla.", fx: { killR: 1 } },
          parcial: { texto: "Ganás uno pero el otro te frena.", fx: { killR: 1, dmgJ: 50 } },
          fallo: { texto: "No lográs separarlos: te comen entre dos.", fx: { killJ: 1 } },
          contra: { texto: "Quisiste aislar y te aislaron a vos.", fx: { killJ: 1 } } } },
      { id: "error", etiqueta: "ESPERAR EL ERROR", sub: "Que se equivoquen bajo presión.", riesgo: "bajo", base: 0.7, tags: ["retake"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Se ponen nerviosos cubriendo y regalan un pick gratis.", fx: { killR: 1 } },
          ok: { texto: "Fuerzan una rotación mala y los castigás.", fx: { intel: 1 } },
          parcial: { texto: "No se equivocan, pero el tiempo los apura a ellos también.", fx: {} },
          fallo: { texto: "No cometen errores: el defuser sigue sonando.", fx: {} },
          contra: { texto: "Mientras esperás, te encuentran y te sacan del retake.", fx: { killJ: 1 } } } }
    ]
  },
  // ================= ATAQUE =================
  {
    id: "droneo", lado: "ataque", tMin: 130, tMax: 200, peso: 3,
    titulo: () => ["Fase de drones", "Ojos adentro"],
    texto: (ctx) => [`Entrás con los drones a ${ctx.sitio}. Cada segundo de info vale oro, pero cada dron perdido es un ojo menos.`,
      `Tus drones recorren ${ctx.sitio}. Ubicar a los defensores ahora vale más que cualquier bala.`],
    quiz: 0.15, quizDif: "medio", avance: [10, 16],
    acciones: [
      { id: "fondo", etiqueta: "DRONAR A FONDO", sub: "Máxima info, pero gastás drones.", riesgo: "bajo", reqRec: "dron", base: 0.8, tags: ["intel"],
        mods: [["Mozzie o Mute del otro lado", -12, (c) => c.rival("mozzie") || c.rival("mute")]],
        resulta: {
          crit: { texto: "Dron perfecto: posiciones, trampas y rotaciones, todo mapeado.", fx: { intel: 3 } },
          ok: { texto: "Buen dronaje: sabés dónde hay al menos dos defensores.", fx: { intel: 2 } },
          parcial: { texto: "Dron a medias: viste algo, pero te rompieron el dron.", fx: { intel: 1 } },
          fallo: { texto: "Te cazan los drones al instante: entrás casi a ciegas.", fx: {} },
          contra: { texto: "Mozzie te hackea el dron: ahora ellos ven lo que vos ves.", fx: { alerta: 2 } } } },
      { id: "ahorro", etiqueta: "AHORRAR DRONES", sub: "Guardás ojos para el final.", riesgo: "bajo", base: 0.9, tags: ["intel"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Con un dron alcanza: justo lo necesario y el resto intacto.", fx: { intel: 1 } },
          ok: { texto: "Dronaje mínimo pero suficiente. Guardás el resto.", fx: {} },
          parcial: { texto: "Por ahorrar, entrás con poca info.", fx: {} },
          fallo: { texto: "El único dron se pierde igual. Doble pérdida.", fx: {} },
          contra: { texto: "Sin info chocás de frente con un ángulo armado.", fx: { dmgJ: 35 } } } },
      { id: "rush", etiqueta: "RUSH SIN INFO", sub: "Velocidad total, cero red.", riesgo: "alto", base: 0.5, tags: ["rush"], estilo: "agresivo",
        resulta: {
          crit: { texto: "¡RUSH PERFECTO! Los agarrás con los pantalones bajos: {rival} cae.", fx: { killR: 1 } },
          ok: { texto: "La velocidad paga: entrás gratis a una zona clave.", fx: { tiempo: -15 } },
          parcial: { texto: "Entrás rápido pero a los tiros: intercambio parejo.", fx: { dmgR: 40, dmgJ: 40 } },
          fallo: { texto: "El rush choca con un crossfire armado.", fx: { dmgJ: 60 } },
          contra: { texto: "Te esperaban el rush: Kapkan o Frost te cobran la entrada.", fx: { killJ: 1 } } } }
    ]
  },
  {
    id: "muro-defendido", lado: "ataque", tMin: 60, tMax: 200, peso: 3,
    cond: (ctx) => ctx.rival("bandit") || ctx.rival("kaid") || ctx.rival("mute"),
    titulo: () => "Pared con truco",
    texto: () => "La pared reforzada está defendida con electricidad. Abrirla no va a ser gratis.",
    quiz: 0.25, quizDif: "experto", avance: [10, 16],
    acciones: [
      { id: "pem", etiqueta: "PEM DE THATCHER", sub: "Limpia la electricidad, si llega.", riesgo: "medio", reqOp: ["thatcher"], consume: "pem", base: 0.68, tags: ["breach", "antigadget"],
        mods: [["Jäger o Wamai cubren", -10, (c) => c.rival("jager") || c.rival("wamai")]],
        resulta: {
          crit: { texto: "PEM perfecto: pared limpia y encima quemás un ADS de regalo.", fx: {} },
          ok: { texto: "La electricidad muere. La pared es tuya.", fx: {} },
          parcial: { texto: "El PEM llega pero tarde: perdés tiempo valioso.", fx: { tiempo: -12 } },
          fallo: { texto: "El PEM cae mal y no limpia nada. Granada gastada.", fx: { utilMal: 1 } },
          contra: { texto: "Jäger o Wamai se comen tu PEM en el aire.", fx: { utilMal: 1, alerta: 1 } } } },
      { id: "timing", etiqueta: "TIMING DE APERTURA", sub: "Abrir justo cuando sacan la batería.", riesgo: "alto", reqOp: ["thermite", "hibana", "ace"], base: 0.55, tags: ["breach"],
        mods: [["Thatcher + Thermite (sinergia)", 10, (c) => c.tiene("thatcher") && c.tiene("thermite")]],
        verProb: true,
        resulta: {
          crit: { texto: "Timing perfecto: la pared se abre y el que hacía el trick queda vendido.", fx: { killR: 1 } },
          ok: { texto: "La pared se abre limpia.", fx: {} },
          parcial: { texto: "Abrís pero gastás una carga de más.", fx: {} },
          fallo: { texto: "El trick te gana: carga quemada y pared cerrada.", fx: { utilMal: 1 } },
          contra: { texto: "Te leen el timing y te reciben con C4 del otro lado.", fx: { utilMal: 1, dmgJ: 50 } } } },
      { id: "otra", etiqueta: "BUSCAR OTRA ENTRADA", sub: "La pared puede esperar.", riesgo: "medio", base: 0.75, tags: ["rotacion"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Encontrás una entrada mucho mejor: la pared defendida queda obsoleta.", fx: { intel: 1 } },
          ok: { texto: "Cambias de frente sin gastar nada.", fx: { tiempo: -10 } },
          parcial: { texto: "La otra entrada también tiene lo suyo.", fx: { tiempo: -12 } },
          fallo: { texto: "Perdés tiempo y la pared sigue cerrada.", fx: { tiempo: -15 } },
          contra: { texto: "La 'otra entrada' era una trampa con mira puesta.", fx: { dmgJ: 50 } } } }
    ]
  },
  {
    id: "ads-cubre", lado: "ataque", tMin: 50, tMax: 200, peso: 2,
    cond: (ctx) => ctx.rival("jager"),
    titulo: () => "ADS cubriendo",
    texto: () => "Un ADS de Jäger zumba cubriendo la entrada: tus proyectiles mueren ahí.",
    quiz: 0.2, quizDif: "medio", avance: [8, 12],
    acciones: [
      { id: "twitch", etiqueta: "ROMPER CON TWITCH", sub: "Dron de descarga, quirúrgico.", riesgo: "medio", reqOp: ["twitch"], consume: "shock", base: 0.7, tags: ["antigadget"],
        mods: [["Mute también cubre", -12, (c) => c.rival("mute")]],
        resulta: {
          crit: { texto: "El dron rompe el ADS y de paso pincha a {rival}.", fx: { dmgR: 20 } },
          ok: { texto: "ADS destruido. La entrada respira.", fx: {} },
          parcial: { texto: "Lo dañás pero sigue funcionando a medias.", fx: {} },
          fallo: { texto: "El dron muere antes de llegar.", fx: { utilMal: 1 } },
          contra: { texto: "Mute + Jäger combinados: dron muerto y posición cantada.", fx: { utilMal: 1, alerta: 1 } } } },
      { id: "gastar", etiqueta: "GASTAR LOS ADS", sub: "Tirar cosas hasta que se callen.", riesgo: "bajo", base: 0.82, tags: ["antigadget"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Gastás los ADS sin gastar nada importante. Entrada libre.", fx: {} },
          ok: { texto: "Los ADS se quedan sin carga. Pasá nomás.", fx: { tiempo: -8 } },
          parcial: { texto: "Gastás tiempo y alguna utilidad menor.", fx: { tiempo: -12 } },
          fallo: { texto: "Gastás utilidad valiosa en ADS que se recargan... no, no se recargan, pero tardaste mucho.", fx: { tiempo: -18 } },
          contra: { texto: "Mientras gastás ADS, te adelantan la posición.", fx: { dmgJ: 40 } } } },
      { id: "igual", etiqueta: "ENTRAR IGUAL", sub: "Los ADS no paran balas.", riesgo: "alto", base: 0.5, tags: ["duelo"], estilo: "agresivo",
        resulta: {
          crit: { texto: "Entrás sin parar y los agarrás mirando los gadgets: {rival} cae.", fx: { killR: 1 } },
          ok: { texto: "La entrada sale bien a pesar del ADS.", fx: {} },
          parcial: { texto: "Entrás pero a los tiros: intercambio parejo.", fx: { dmgR: 35, dmgJ: 35 } },
          fallo: { texto: "El ADS no era el problema: el problema era la mira que lo cubría.", fx: { dmgJ: 60 } },
          contra: { texto: "Entrás directo a un crossfire con ADS de fondo.", fx: { killJ: 1 } } } }
    ]
  },
  {
    id: "roamer-fuera", lado: "ataque", tMin: 60, tMax: 200, peso: 2,
    cond: (ctx) => ctx.rival("caveira") || ctx.rival("vigil") || ctx.rival("oryx") || ctx.rival("valkyrie"),
    titulo: () => "Pasos arriba",
    texto: () => "Escuchás pasos por encima: hay un roamer suelto y sabe que viniste.",
    quiz: 0.15, quizDif: "medio", avance: [8, 12],
    acciones: [
      { id: "cazar", etiqueta: "CAZAR AL ROAMER", sub: "Si lo sacás, el mapa es tuyo.", riesgo: "alto", base: 0.52, tags: ["duelo"],
        mods: [["IQ, Jackal o Dokkaebi en tu equipo", 12, (c) => c.tiene("iq") || c.tiene("jackal") || c.tiene("dokkaebi")]],
        verProb: true,
        resulta: {
          crit: { texto: "Caza perfecta: {rival} cae sin hacer ruido. 5v4.", fx: { killR: 1 } },
          ok: { texto: "Lo encontrás y lo sacás: {rival} eliminado.", fx: { killR: 1 } },
          parcial: { texto: "Lo herís pero escapa al sitio avisando todo.", fx: { dmgR: 55, alerta: 2 } },
          fallo: { texto: "El roamer te da vuelta la caza: te saca él a vos.", fx: { killJ: 1 } },
          contra: { texto: "Era Caveira: te interroga y todo tu equipo queda marcado.", fx: { killJ: 1, alerta: 2 } } } },
      { id: "evitar", etiqueta: "DRONAR Y EVITAR", sub: "No lo peleás: lo dejás sin trabajo.", riesgo: "bajo", base: 0.85, tags: ["intel"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Lo tenés dronado todo el tiempo: juega con miedo y no hace nada.", fx: { intel: 2 } },
          ok: { texto: "Sabés dónde está y lo evitás. Roamer anulado.", fx: { intel: 1 } },
          parcial: { texto: "Lo evitás pero te hace perder tiempo.", fx: { tiempo: -10 } },
          fallo: { texto: "Se mueve más rápido que tus drones y te aparece igual.", fx: { alerta: 1 } },
          contra: { texto: "Mientras lo evitás, el sitio se refuerza el doble.", fx: { alerta: 1 } } } },
      { id: "objetivo", etiqueta: "SEGUIR AL OBJETIVO", sub: "El roamer que ladre: vos vas al sitio.", riesgo: "medio", base: 0.7, tags: ["plant"], estilo: "agresivo",
        resulta: {
          crit: { texto: "Vas directo y el roamer llega tarde a todo. Sitio a medio tomar.", fx: { tiempo: -10 } },
          ok: { texto: "Ignorás al roamer y ganás terreno clave.", fx: {} },
          parcial: { texto: "Avanzás pero con el roamer respirándote en la nuca.", fx: { alerta: 1 } },
          fallo: { texto: "El roamer te corta la espalda en plena ejecución.", fx: { dmgJ: 55 } },
          contra: { texto: "Te deja avanzar para encerrarte: caés en la trampa.", fx: { killJ: 1 } } } }
    ]
  },
  {
    id: "gas-niega", lado: "ataque", tMin: 0, tMax: 70, peso: 3,
    cond: (ctx) => ctx.rival("smoke"),
    titulo: () => "Gas en el plant",
    texto: (ctx) => "El gas de Smoke inunda la zona del plant. Quedan {tiempo} en el reloj.",
    quiz: 0, avance: [5, 8],
    acciones: [
      { id: "esperar", etiqueta: "ESPERAR EL GAS", sub: "El gas se va, el reloj también.", riesgo: "medio", base: 0.6, tags: ["reloj"], estilo: "pasivo",
        mods: [["Quedan más de 35 segundos", 10, (c) => c.tiempo > 35]],
        resulta: {
          crit: { texto: "El gas se disipa y plantás tranquilo con tiempo de sobra.", fx: { planta: true } },
          ok: { texto: "Esperás lo justo y plantás.", fx: { planta: true, tiempo: -15 } },
          parcial: { texto: "Plantás pero con el reloj muy justo.", fx: { planta: true, tiempo: -25 } },
          fallo: { texto: "El gas dura más que tu paciencia: se acaba el tiempo.", fx: {} },
          contra: { texto: "Mientras esperás el gas, te cazan desde un ángulo.", fx: { killJ: 1 } } } },
      { id: "pasar", etiqueta: "ATRAVESAR EL GAS", sub: "Duele, pero el plant no espera.", riesgo: "alto", base: 0.48, tags: ["plant"], estilo: "agresivo", qte: 8,
        resulta: {
          crit: { texto: "¡A través del gas y plantando! Nadie esperaba ese coraje.", fx: { planta: true } },
          ok: { texto: "Plantás tosiendo pero plantás. Ahora a defenderlo.", fx: { planta: true, dmgJ: 30 } },
          parcial: { texto: "Llegás al plant pero muy tocado.", fx: { planta: true, dmgJ: 60 } },
          fallo: { texto: "El gas te frena a mitad de camino y tenés que salir.", fx: { dmgJ: 55 } },
          contra: { texto: "Caés en el gas delante de todos. Plant regalado al rival.", fx: { killJ: 1 } } } },
      { id: "cortar", etiqueta: "CORTAR A SMOKE", sub: "Sin Smoke no hay gas.", riesgo: "medio", base: 0.58, tags: ["duelo"],
        resulta: {
          crit: { texto: "Encontrás a Smoke guardando el gas y lo sacás: {rival} eliminado.", fx: { killR: 1 } },
          ok: { texto: "Smoke cae: {rival} eliminado y el plant queda libre.", fx: { killR: 1 } },
          parcial: { texto: "Lo herís y tira el gas apurado y mal.", fx: { dmgR: 50 } },
          fallo: { texto: "Smoke te estaba esperando con el gas en la mano.", fx: { dmgJ: 50 } },
          contra: { texto: "Fuiste a buscar a Smoke y te emboscaron entre dos.", fx: { killJ: 1 } } } }
    ]
  },
  {
    id: "evil-mira", lado: "ataque", tMin: 40, tMax: 200, peso: 2,
    cond: (ctx) => ctx.rival("maestro") || ctx.rival("mira"),
    titulo: () => "Ojos en la pared",
    texto: () => "Un Evil Eye o un espejo te mira fijo: cada paso que das lo ven.",
    quiz: 0.15, quizDif: "medio", avance: [8, 12],
    acciones: [
      { id: "romper", etiqueta: "ROMPERLO", sub: "Sin ojos no hay info.", riesgo: "medio", reqOp: ["ash", "zofia", "sledge", "twitch", "kali"], base: 0.68, tags: ["antigadget"],
        resulta: {
          crit: { texto: "Lo rompés limpio y de paso el ruido tapa tu avance.", fx: {} },
          ok: { texto: "Ojo destruido. Esa pared quedó ciega.", fx: {} },
          parcial: { texto: "Lo rompés pero te cuesta utilidad y tiempo.", fx: { tiempo: -10 } },
          fallo: { texto: "Fallás el tiro y el ojo sigue mirando.", fx: { alerta: 1 } },
          contra: { texto: "Al asomar para romperlo te llevás un rayo del Evil Eye.", fx: { dmgJ: 45 } } } },
      { id: "humo", etiqueta: "HUMO Y PASAR", sub: "Si no te ven, no existís.", riesgo: "medio", base: 0.72, tags: ["humo"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Humo perfecto: pasás por delante sin que se enteren.", fx: {} },
          ok: { texto: "El humo tapa el ojo y avanzás.", fx: {} },
          parcial: { texto: "El humo tapa a medias: pasan pero marcados.", fx: { alerta: 1 } },
          fallo: { texto: "El humo cae mal y el ojo sigue viendo todo.", fx: { alerta: 1 } },
          contra: { texto: "Tirás el humo y justo hay un ADS... no, peor: te estaban esperando en la salida.", fx: { dmgJ: 45 } } } },
      { id: "ignorar", etiqueta: "IGNORARLO", sub: "Jugar delante de cámaras: picante.", riesgo: "alto", base: 0.5, tags: ["duelo"], estilo: "agresivo",
        resulta: {
          crit: { texto: "Les jugás en la cara igual y no pueden hacer nada.", fx: {} },
          ok: { texto: "Avanzás a pesar del ojo. Les tiembla el pulso.", fx: {} },
          parcial: { texto: "Te ven todo el avance: llegan preparados.", fx: { alerta: 2 } },
          fallo: { texto: "Con toda la info, te reciben armados.", fx: { dmgJ: 55 } },
          contra: { texto: "El Evil Eye te marca y te cae todo el equipo encima.", fx: { killJ: 1 } } } }
    ]
  },
  {
    id: "ancla-sitio", lado: "ataque", tMin: 40, tMax: 200, peso: 2,
    titulo: () => ["Un ancla encerrado", "Rata en el sitio"],
    texto: (ctx) => [`Hay un defensor encerrado en ${ctx.sitio} que no sale ni con música. Sacarlo cuesta, pero vale.`,
      `Detectás a uno fijo en ${ctx.sitio}: juega quieto y cubre todo. Hay que sacarlo.`],
    quiz: 0.1, quizDif: "medio", avance: [8, 12],
    acciones: [
      { id: "aislar", etiqueta: "AISLARLO", sub: "Cortarle ayuda y dejarlo solo.", riesgo: "medio", base: 0.62, tags: ["duelo"],
        resulta: {
          crit: { texto: "Lo aislás perfecto y cae sin que nadie lo ayude: {rival} eliminado.", fx: { killR: 1 } },
          ok: { texto: "Lo dejás solo y lo sacás: {rival} eliminado.", fx: { killR: 1 } },
          parcial: { texto: "Lo presionás pero lo bancan desde otro ángulo.", fx: { dmgR: 40 } },
          fallo: { texto: "Al querer aislarlo te metés en su crossfire.", fx: { dmgJ: 55 } },
          contra: { texto: "El 'solo' tenía a todo el equipo mirándolo.", fx: { killJ: 1 } } } },
      { id: "cortar", etiqueta: "CORTAR SU ROTACIÓN", sub: "Que no se mueva ni se cure.", riesgo: "medio", base: 0.7, tags: ["intel"],
        resulta: {
          crit: { texto: "Le cortás todo: rotación, ayuda y salida. Pan comido después.", fx: { intel: 1 } },
          ok: { texto: "Queda encerrado sin apoyo.", fx: {} },
          parcial: { texto: "Lo presionás pero zafa rotando.", fx: {} },
          fallo: { texto: "Mientras lo cortás, otro te corta a vos.", fx: { dmgJ: 45 } },
          contra: { texto: "El ancla era carnada: te encierran a vos.", fx: { killJ: 1 } } } },
      { id: "dodos", etiqueta: "ENTRAR DE A DOS", sub: "Tradeo cantado si van juntos.", riesgo: "alto", base: 0.55, tags: ["duelo"], estilo: "agresivo",
        resulta: {
          crit: { texto: "Entran juntos y lo borran sin despeinarse: {rival} eliminado.", fx: { killR: 1 } },
          ok: { texto: "El tradeo funciona: {rival} eliminado.", fx: { killR: 1 } },
          parcial: { texto: "Intercambian uno por uno.", fx: { killR: 1, killJ: 1 } },
          fallo: { texto: "El ancla se lleva al primero y el segundo retrocede.", fx: { killJ: 1 } },
          contra: { texto: "Los esperaba con ayuda: doble baja rival.", fx: { killJ: 2 } } } }
    ]
  },
  {
    id: "info-parcial", lado: "ataque", tMin: 60, tMax: 200, peso: 2,
    titulo: () => ["Info a medias", "Solo viste a dos"],
    texto: () => ["Solo ubicaste a dos defensores de cinco. El resto es niebla: pueden estar en cualquier lado.",
      "Tu info está incompleta: dos vistos, tres fantasmas. Jugar así es picante."],
    quiz: 0.15, quizDif: "medio", avance: [8, 12],
    acciones: [
      { id: "dronar", etiqueta: "SEGUIR DRONANDO", sub: "Completar el mapa antes de entrar.", riesgo: "bajo", base: 0.78, tags: ["intel"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Dronaje completo: los cinco ubicados y el plan clarito.", fx: { intel: 2 } },
          ok: { texto: "Encontrás a dos más: ya casi está el mapa.", fx: { intel: 1 } },
          parcial: { texto: "Dronás pero te rompen los drones.", fx: {} },
          fallo: { texto: "Perdés tiempo y drones sin ver nada nuevo.", fx: { tiempo: -12 } },
          contra: { texto: "Mientras dronás, te adelantan y te cazan un dron... y casi a vos.", fx: { alerta: 1, dmgJ: 25 } } } },
      { id: "jugar", etiqueta: "JUGAR CON LO QUE HAY", sub: "Dos vistos alcanzan si sos rápido.", riesgo: "medio", base: 0.62, tags: ["duelo"], estilo: "agresivo",
        resulta: {
          crit: { texto: "Con poca info igual los pasás por arriba: {rival} eliminado.", fx: { killR: 1 } },
          ok: { texto: "La velocidad compensa la info: entrás bien.", fx: {} },
          parcial: { texto: "Te topás con uno que no tenías: intercambio parejo.", fx: { dmgR: 35, dmgJ: 35 } },
          fallo: { texto: "El que no viste te estaba esperando.", fx: { dmgJ: 60 } },
          contra: { texto: "Los tres fantasmas te arman la bienvenida.", fx: { killJ: 1 } } } },
      { id: "presion", etiqueta: "PRESIONAR PARA FORZAR INFO", sub: "Que se muestren solos.", riesgo: "alto", base: 0.55, tags: ["intel", "duelo"], estilo: "agresivo",
        resulta: {
          crit: { texto: "Presionás y se muestran todos: info completa y un pick de regalo.", fx: { killR: 1, intel: 2 } },
          ok: { texto: "La presión los obliga a moverse: ahora los ves.", fx: { intel: 1 } },
          parcial: { texto: "Se muestran a medias: algo de info, algo de riesgo.", fx: { intel: 1, dmgJ: 25 } },
          fallo: { texto: "Presionás y no se muestra nadie: quedaste vendido.", fx: { alerta: 2 } },
          contra: { texto: "La presión te deja regalado y te castigan.", fx: { killJ: 1 } } } }
    ]
  },
  {
    id: "reloj-quema", lado: "ataque", tMin: 50, tMax: 130, peso: 2,
    titulo: () => ["El reloj quema", "Mitad de ronda, nada claro"],
    texto: (ctx) => [`Pasó la mitad de la ronda y no hay entrada clara en ${ctx.sitio}. El reloj empieza a pesar.`,
      `Quedan {tiempo} y el sitio sigue cerrado. Hay que decidir el ritmo ahora.`],
    quiz: 0.1, quizDif: "medio", avance: [8, 12],
    acciones: [
      { id: "acelerar", etiqueta: "ACELERAR", sub: "Pisar el acelerador de golpe.", riesgo: "alto", base: 0.52, tags: ["rush"], estilo: "agresivo",
        resulta: {
          crit: { texto: "Acelerás de golpe y los pasás por arriba: {rival} eliminado.", fx: { killR: 1 } },
          ok: { texto: "El cambio de ritmo funciona: ganás terreno clave.", fx: { tiempo: -10 } },
          parcial: { texto: "Acelerás pero a los tiros: intercambio parejo.", fx: { dmgR: 40, dmgJ: 40 } },
          fallo: { texto: "Acelerás contra un crossfire armado.", fx: { dmgJ: 60 } },
          contra: { texto: "Te esperaban acelerando: te frenan en seco.", fx: { killJ: 1 } } } },
      { id: "reagrupar", etiqueta: "REAGRUPAR Y EJECUTAR", sub: "Juntarse y entrar como equipo.", riesgo: "medio", base: 0.65, tags: ["plant"],
        resulta: {
          crit: { texto: "Ejecución perfecta de manual: entran juntos y no hay respuesta.", fx: { killR: 1 } },
          ok: { texto: "La ejecución ordenada abre el sitio.", fx: {} },
          parcial: { texto: "Ejecutan pero desprolijos: entran a los tiros.", fx: { dmgJ: 30 } },
          fallo: { texto: "Mientras se juntan, los cazan rotando.", fx: { dmgJ: 50 } },
          contra: { texto: "Juntarse hizo ruido: les tiran todo junto.", fx: { killJ: 1 } } } },
      { id: "trabajar", etiqueta: "SEGUIR TRABAJANDO", sub: "Paciencia un rato más.", riesgo: "bajo", base: 0.78, tags: ["reloj"], estilo: "pasivo",
        resulta: {
          crit: { texto: "La paciencia paga: encontrás el hueco perfecto.", fx: { intel: 1 } },
          ok: { texto: "Siguen trabajando el mapa sin regalar nada.", fx: {} },
          parcial: { texto: "Se consume tiempo valioso sin avances.", fx: { tiempo: -12 } },
          fallo: { texto: "Tanto esperar y el reloj ya apura de verdad.", fx: { tiempo: -18 } },
          contra: { texto: "Mientras trabajan tranquilos, les cazan un dron... y un jugador.", fx: { killJ: 1 } } } }
    ]
  },
  {
    id: "clutch-atk", lado: "ataque", tMin: 0, tMax: 200, peso: 0,
    cond: (ctx) => ctx.vivosJ === 1 && ctx.vivosR >= 2,
    titulo: () => "CLUTCH: 1 VS RESTO",
    texto: (ctx) => `Solo quedás vos contra ${ctx.vivosR}. Quedan {tiempo}. El plant sigue siendo una opción.`,
    quiz: 0, avance: [5, 8],
    acciones: [
      { id: "plantar", etiqueta: "IR AL PLANT", sub: "El defuser es tu mejor compañero.", riesgo: "medio", base: 0.55, tags: ["clutch", "plant"], estilo: "agresivo",
        resulta: {
          crit: { texto: "Plantás sin que se enteren y ahora el retake es de ellos. Clutch en marcha.", fx: { planta: true } },
          ok: { texto: "Lográs plantar: {rival} no llegó a cortarte.", fx: { planta: true } },
          parcial: { texto: "Plantás pero herido y marcado.", fx: { planta: true, dmgJ: 45 } },
          fallo: { texto: "Te cortan el plant en el último segundo.", fx: { dmgJ: 50 } },
          contra: { texto: "Te estaban esperando en el sitio del plant.", fx: { killJ: 1 } } } },
      { id: "duelos", etiqueta: "BUSCAR DUELOS", sub: "De a uno se puede.", riesgo: "alto", base: 0.45, tags: ["clutch", "duelo"], estilo: "agresivo",
        resulta: {
          crit: { texto: "¡DOS DUELOS, DOS BAJAS! El clutch se huele.", fx: { killR: 2 } },
          ok: { texto: "Ganás el primero: {rival} eliminado.", fx: { killR: 1 } },
          parcial: { texto: "Ganás uno pero quedás muy tocado.", fx: { killR: 1, dmgJ: 60 } },
          fallo: { texto: "Perdés el duelo.", fx: { dmgJ: 80 } },
          contra: { texto: "No era uno: te tradean al instante.", fx: { killJ: 1 } } } },
      { id: "esconder", etiqueta: "ESCONDERSE Y ESCUCHAR", sub: "Que vengan ellos.", riesgo: "bajo", base: 0.7, tags: ["clutch"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Se desesperan buscándote y se separan: los escuchás a todos.", fx: { intel: 2 } },
          ok: { texto: "El tiempo juega para vos: se apuran y cometen errores.", fx: {} },
          parcial: { texto: "No vienen y el reloj se consume.", fx: { tiempo: -15 } },
          fallo: { texto: "Te encuentran escondido.", fx: { dmgJ: 50 } },
          contra: { texto: "Te rodean entre todos sin que los escuches llegar.", fx: { killJ: 1 } } } }
    ]
  },
  {
    id: "exec-plant", lado: "ataque", tMin: 0, tMax: 200, peso: 0,
    cond: (ctx) => !ctx.plantado && (ctx.vivosR <= ctx.vivosJ - 1 || ctx.tiempo < 50),
    titulo: () => ["Momento de ejecutar", "A cerrar el sitio"],
    texto: () => ["Tenés la ventaja o el reloj apura: es hora de entrar al sitio y plantar.",
      "El sitio está maduro: entrá, plantá y que el retake sea problema de ellos."],
    quiz: 0, avance: [6, 10],
    acciones: [
      { id: "plantar", etiqueta: "PLANTAR YA", sub: "Defuser al piso y a defenderlo.", riesgo: "medio", base: 0.62, tags: ["plant"], estilo: "agresivo",
        resulta: {
          crit: { texto: "Plant limpio y rápido: el sitio es tuyo y el retake es de ellos.", fx: { planta: true } },
          ok: { texto: "El defuser queda plantado. Ahora a cerrarlo.", fx: { planta: true } },
          parcial: { texto: "Plantás pero bajo presión y herido.", fx: { planta: true, dmgJ: 40 } },
          fallo: { texto: "Te cortan el plant a último momento.", fx: { dmgJ: 50 } },
          contra: { texto: "Te estaban esperando en el plant: te sacan con el defuser en la mano.", fx: { killJ: 1 } } } },
      { id: "fake", etiqueta: "FAKEAR EL PLANT", sub: "Que gasten todo en nada.", riesgo: "medio", base: 0.7, tags: ["plant", "intel"],
        resulta: {
          crit: { texto: "El fake es perfecto: gastan C4, gas y rotaciones en un plant que no existe.", fx: { intel: 1 } },
          ok: { texto: "Pican el fake y gastan utilidad. Ahora el verdadero.", fx: {} },
          parcial: { texto: "Pican a medias: gastan algo pero no todo.", fx: {} },
          fallo: { texto: "No pican el fake: perdiste tiempo.", fx: { tiempo: -10 } },
          contra: { texto: "Leen el fake y te castigan saliendo.", fx: { dmgJ: 45 } } } },
      { id: "limpiar", etiqueta: "LIMPIAR PRIMERO", sub: "Asegurar antes de plantar.", riesgo: "bajo", base: 0.78, tags: ["duelo"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Limpieza total: {rival} cae y el sitio queda regalado.", fx: { killR: 1 } },
          ok: { texto: "Asegurás la zona y plantás tranquilo.", fx: { planta: true } },
          parcial: { texto: "Limpias a medias: plantás pero con gente viva.", fx: { planta: true } },
          fallo: { texto: "Al limpiar te encuentran y te frenan.", fx: { dmgJ: 50 } },
          contra: { texto: "La 'limpieza' era una emboscada.", fx: { killJ: 1 } } } }
    ]
  },
  {
    id: "disputa-angulo", lado: "ataque", tMin: 0, tMax: 200, peso: 1,
    titulo: () => "Disputa del ángulo",
    texto: (ctx) => `Hay un ángulo largo sin dueño claro en ${ctx.sitio}. Quien lo tome primero manda en la zona.`,
    quiz: 0, avance: [8, 14],
    acciones: [
      { id: "tomar", etiqueta: "TOMAR EL ÁNGULO", sub: "Duelo directo por el control.", riesgo: "medio", base: 0.6, tags: ["duelo"], estilo: "agresivo",
        mods: [["Tenés info del otro lado", 8, (c) => c.intel >= 2]],
        resulta: {
          crit: { texto: "Lo tomás perfecto y encima {rival} pica regalado.", fx: { killR: 1, intel: 1 } },
          ok: [{ texto: "Ganás el ángulo: la zona es tuya.", fx: {} },
            { texto: "El ángulo queda tomado sin disparar un tiro.", fx: {} }],
          parcial: [{ texto: "Lo disputan tiro a tiro: nadie lo tiene claro.", fx: { dmgR: 30, dmgJ: 30 } },
            { texto: "Intercambiás daño y el ángulo sigue en pelea.", fx: { dmgR: 35, dmgJ: 35 } }],
          fallo: [{ texto: "El ángulo era trampa: te reciben armado.", fx: { dmgJ: 50 } },
            { texto: "Llegás segundo al ángulo y te castigan.", fx: { dmgJ: 55 } }],
          contra: { texto: "Te estaban esperando con crossfire.", fx: { killJ: 1 } } } },
      { id: "humo", etiqueta: "HUMO Y CRUZAR", sub: "Gastás utilidad para pasar gratis.", riesgo: "bajo", consume: "util", base: 0.78, tags: ["humo"], estilo: "pasivo",
        resulta: {
          crit: { texto: "El humo es perfecto: cruzás y encima escuchás todo del otro lado.", fx: { intel: 1 } },
          ok: [{ texto: "Cruzás tapado sin que te vean.", fx: {} },
            { texto: "El humo te regala el cruce limpio.", fx: {} }],
          parcial: [{ texto: "El humo tapa a medias: pasás pero marcado.", fx: { alerta: 1 } },
            { texto: "Cruzás justo cuando se disipa: te ven de refilón.", fx: { alerta: 1 } }],
          fallo: [{ texto: "El humo cae mal y cruzás a la vista de todos.", fx: { dmgJ: 40 } },
            { texto: "Humo gastado y cruce regalado.", fx: { utilMal: 1, alerta: 1 } }],
          contra: { texto: "Te esperan a la salida del humo.", fx: { dmgJ: 60 } } } },
      { id: "error", etiqueta: "ESPERAR EL ERROR", sub: "Que el ángulo se regale solo.", riesgo: "bajo", base: 0.8, tags: ["reloj"], estilo: "pasivo",
        resulta: {
          crit: { texto: "Se impacientan y pican de a uno: fiesta para vos.", fx: { killR: 1 } },
          ok: [{ texto: "El rival se apura y te regala el ángulo.", fx: {} },
            { texto: "Esperás y el ángulo cae solo.", fx: {} }],
          parcial: [{ texto: "Nadie se mueve: se consume tiempo de los dos.", fx: { tiempo: -10 } },
            { texto: "Standoff eterno: perdés segundos valiosos.", fx: { tiempo: -12 } }],
          fallo: [{ texto: "Mientras esperás, refuerzan el ángulo el doble.", fx: { alerta: 1 } },
            { texto: "Tu espera les sirve a ellos para acomodarse.", fx: { alerta: 1 } }],
          contra: { texto: "Te leen la espera y te flanquean.", fx: { dmgJ: 50 } } } }
    ]
  }
];
