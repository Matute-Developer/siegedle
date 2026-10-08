/* Estado de la ronda: intentos ilimitados y objetivo secreto. */
window.SIEGE_DLE = window.SIEGE_DLE || {};
window.SIEGE_DLE.state = {
  intentos: [],
  objetivoId: null,
  terminada: false,
  realizados() { return this.intentos.length; },
  puedeJugar() { return !this.terminada; },
  objetivo() {
    return (window.SIEGE_DLE.operators || []).find((o) => o.id === this.objetivoId) || null;
  },
  elegirObjetivo() {
    const ops = window.SIEGE_DLE.operators || [];
    if (!ops.length) { this.objetivoId = null; return null; }
    this.objetivoId = ops[Math.floor(Math.random() * ops.length)].id;
    return this.objetivo();
  },
  reiniciar() {
    this.intentos = [];
    this.terminada = false;
    this.elegirObjetivo();
  }
};
