(function () {
  function abrir() { document.getElementById("modal-ayuda").hidden = false; }
  function cerrar() { document.getElementById("modal-ayuda").hidden = true; }
  function victoria(op) {
    const nombre = document.getElementById("victoria-nombre");
    if (nombre) nombre.textContent = op.nombre;
    const retrato = document.getElementById("victoria-retrato");
    if (retrato) retrato.innerHTML = window.SIEGE_DLE.retrato.retratoHTML(op, "ok");
    document.getElementById("modal-victoria").hidden = false;
  }
  function cerrarVictoria() { document.getElementById("modal-victoria").hidden = true; }
  function init() {
    document.getElementById("btn-ayuda").addEventListener("click", abrir);
    document.getElementById("btn-cerrar-ayuda").addEventListener("click", cerrar);
    document.getElementById("btn-empezar").addEventListener("click", cerrar);
    document.getElementById("modal-ayuda").addEventListener("click", e => { if (e.target.id === "modal-ayuda") cerrar(); });
    document.getElementById("btn-otra-ronda").addEventListener("click", () => {
      cerrarVictoria();
      document.getElementById("btn-reiniciar").click();
    });
    document.getElementById("modal-victoria").addEventListener("click", e => { if (e.target.id === "modal-victoria") cerrarVictoria(); });
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      cerrar();
      cerrarVictoria();
    });
  }
  window.SIEGE_DLE = window.SIEGE_DLE || {};
  window.SIEGE_DLE.modal = { init, abrir, cerrar, victoria, cerrarVictoria };
})();
