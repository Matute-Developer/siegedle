/* Navegación por vistas con hash (#/jugar...). */
(function () {
  const VISTAS = { jugar: "vista-jugar", operadores: "vista-operadores", partida: "vista-partida" };
  function mostrar(clave) {
    if (!VISTAS[clave]) clave = "jugar";
    Object.values(VISTAS).forEach(id => document.getElementById(id).hidden = id !== VISTAS[clave]);
    document.querySelectorAll("[data-nav]").forEach(b => b.classList.toggle("is-active", b.dataset.nav === clave));
    const movil = document.getElementById("mobile-nav");
    if (movil) movil.hidden = true;
    const menu = document.getElementById("btn-menu");
    if (menu) menu.setAttribute("aria-expanded", "false");
  }
  function actual() { return (location.hash || "#/jugar").replace("#/", "") || "jugar"; }
  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-nav]");
    if (!btn) return;
    location.hash = "#/" + btn.dataset.nav;
  });
  window.addEventListener("hashchange", () => mostrar(actual()));
  window.SIEGE_DLE = window.SIEGE_DLE || {};
  window.SIEGE_DLE.navigation = { mostrar, actual };
})();
