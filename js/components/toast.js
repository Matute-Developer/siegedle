(function () {
  function mostrar(texto, tipo = "info", ms = 2800) {
    const zona = document.getElementById("toasts");
    const el = document.createElement("div");
    el.className = `toast ${tipo}`;
    el.textContent = texto;
    zona.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 320); }, ms);
  }
  window.SIEGE_DLE = window.SIEGE_DLE || {};
  window.SIEGE_DLE.toast = { mostrar };
})();
