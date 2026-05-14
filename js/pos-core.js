import { productosMaster, tasaActual } from './pos-db-motor.js';

class POSSystem {
    constructor() {
        this.carrito = [];
        this.totalUSD = 0;
        this.indiceSeleccionado = -1;
        this.init();
    }

    init() {
        // Event Listeners de Pago
        ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.calcularRestante());
        });

        // Shortcuts de Teclado (F4, F5, F6, F9)
        window.addEventListener('keydown', (e) => this.handleShortcuts(e));
        
        // Exponer funciones globales necesarias para el HTML
        window.ui = {
            autoCompletar: (tipo) => this.autoCompletar(tipo)
        };
    }

    autoCompletar(tipo) {
        const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
        const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
        const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
        const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;

        let pagadoOtrosUSD = 0;
        if (tipo !== 'punto') pagadoOtrosUSD += (p / tasaActual);
        if (tipo !== 'pagomovil') pagadoOtrosUSD += (pm / tasaActual);
        if (tipo !== 'efectivo') pagadoOtrosUSD += (ef / tasaActual);
        if (tipo !== 'divisas') pagadoOtrosUSD += dv;

        const faltanteUSD = this.totalUSD - pagadoOtrosUSD;

        if (faltanteUSD > 0) {
            if (tipo === 'divisas') {
                document.getElementById('in-divisas-usd').value = faltanteUSD.toFixed(2);
            } else {
                document.getElementById(`in-${tipo}-bs`).value = (faltanteUSD * tasaActual).toFixed(2);
            }
        }
        this.calcularRestante();
    }

    calcularRestante() {
        const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
        const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
        const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
        const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;

        const pagadoUSD = dv + ((p + pm + ef) / tasaActual);
        const faltante = this.totalUSD - pagadoUSD;
        
        const status = document.getElementById('pago-status');
        const btn = document.getElementById('btnConfirmarVenta');

        if (faltante <= 0.01) {
            status.className = "status-badge status-complete";
            status.innerText = faltante < -0.01 ? "CAMBIO LISTO" : "PAGO COMPLETO";
            btn.disabled = false;
        } else {
            status.className = "status-badge status-pending";
            status.innerText = `FALTANTE: $ ${faltante.toFixed(2)}`;
            btn.disabled = true;
        }
    }

    handleShortcuts(e) {
        if (e.key === "F9") {
            e.preventDefault();
            if (this.carrito.length > 0) {
                document.getElementById('totalModalUSD').innerText = `$ ${this.totalUSD.toFixed(2)}`;
                document.getElementById('totalModalBS').innerText = `${(this.totalUSD * tasaActual).toLocaleString('es-VE')} Bs`;
                document.getElementById('modalPago').style.display = "flex";
                this.calcularRestante();
            }
        }
        // ... Lógica adicional para F4, F5, F6 ...
    }
}

new POSSystem();
