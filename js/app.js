/* Arranque de la app. Solo orquesta módulos, sin lógica pegada aquí. */
(function () {
  function fechaHoy() {
    const f = new Date();
    const s = f.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    document.getElementById("fecha-hoy").textContent = s.charAt(0).toUpperCase() + s.slice(1);
  }
  function menuMovil() {
    const btn = document.getElementById("btn-menu");
    const nav = document.getElementById("mobile-nav");
    btn.addEventListener("click", () => {
      const abierto = nav.hidden;
      nav.hidden = !abierto;
      btn.setAttribute("aria-expanded", String(abierto));
    });
  }
  function filtros() {
    document.querySelectorAll("[data-filtro]").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("[data-filtro]").forEach(c => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        window.SIEGE_DLE.board.pintarGaleria(chip.dataset.filtro);
      });
    });
  }
  function entrarPartidaSiToca() {
    if (window.SIEGE_DLE.navigation.actual() === "partida" && window.SIEGE_DLE.partidaUI) {
      window.SIEGE_DLE.partidaUI.entrar();
    }
  }
  function reiniciar() {
    document.getElementById("btn-reiniciar").addEventListener("click", () => {
      window.SIEGE_DLE.state.reiniciar();
      window.SIEGE_DLE.board.ocultarBanner();
      window.SIEGE_DLE.board.pintar();
      window.SIEGE_DLE.toast.mostrar(window.SIEGE_DLE.textos.rondaReiniciada, "success");
    });
  }
  document.addEventListener("DOMContentLoaded", async () => {
    fechaHoy();
    menuMovil();
    filtros();
    reiniciar();
    window.SIEGE_DLE.search.init();
    window.SIEGE_DLE.modal.init();
    if (window.SIEGE_DLE.ficha) window.SIEGE_DLE.ficha.init();
    window.SIEGE_DLE.navigation.mostrar(window.SIEGE_DLE.navigation.actual());
    // Intenta backend primero; si no hay servidor, usa datos locales sin romper nada.
    try {
      const r = await window.SIEGE_DLE.api.cargarOperadores();
      const etiqueta = r.origen === "local" ? "Local" : "API (" + r.origen.replace("api:", "") + ")";
      document.getElementById("origen-datos").textContent = etiqueta;
      if (r.origen !== "local") {
        document.getElementById("mensaje-buscador").textContent =
          `Conectado a la base de datos (${r.total} operadores).`;
      }
    } catch {
      document.getElementById("origen-datos").textContent = "Local";
    }
    window.SIEGE_DLE.state.elegirObjetivo();
    window.SIEGE_DLE.board.pintar();
    window.SIEGE_DLE.board.pintarResumen();
    window.SIEGE_DLE.board.pintarGaleria("todos");
    window.addEventListener("hashchange", entrarPartidaSiToca);
    entrarPartidaSiToca();
  });
})();
