// ==========================================
// 5. INICIALIZACIÓN UNIFICADA (A prueba de fallos)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("Inicializando POS...");

    // 1. INICIALIZAR BUSCADORES (Primero, para que el POS funcione rápido)
    const inputCliente = document.getElementById('buscar-cliente-pos');
    if (inputCliente) {
        inputCliente.addEventListener('input', (e) => {
            const resultados = window.buscarCliente(e.target.value);
            const divRes = document.getElementById('resultados-cliente-pos');
            if (resultados.length > 0 && e.target.value.trim() !== "") {
                divRes.style.display = 'block';
                divRes.innerHTML = resultados.map(c => `
                    <div class="resultado-item" style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;"
                         onclick="window.seleccionarCliente('${c.id}', '${c.nombre.replace(/'/g, "\\'")}')">
                         <strong>${c.id}</strong> - ${c.nombre}
                    </div>`).join('');
            } else { divRes.style.display = 'none'; }
        });
        inputCliente.addEventListener('keydown', (e) => window.indiceClie = window.manejarNavegacion(e, 'resultados-cliente-pos', window.indiceClie));
    }

    const inputProd = document.getElementById('buscar-producto-pos');
    if (inputProd) {
        inputProd.addEventListener('input', (e) => {
            const resultados = window.buscarProducto(e.target.value);
            const divRes = document.getElementById('resultados-producto-pos');
            if (resultados.length > 0 && e.target.value.trim() !== "") {
                divRes.style.display = 'block';
                divRes.innerHTML = resultados.map(p => `
                    <div class="resultado-item" style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;"
                         onclick="window.seleccionarProducto('${p.id}')">
                         <strong>${p.nombre}</strong> - $${p.precio}
                    </div>`).join('');
            } else { divRes.style.display = 'none'; }
        });
        inputProd.addEventListener('keydown', (e) => window.indiceProd = window.manejarNavegacion(e, 'resultados-producto-pos', window.indiceProd));
    }

    // 2. INICIALIZAR LÓGICA DE PAGOS (La que te funcionaba)
    const camposBs = ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs'];
    const inputDivisas = document.getElementById('in-divisas-usd');

    camposBs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', () => {
                const totalBs = (window.totalVentaUSD || 0) * tasaActual;
                const valorDivisasBs = (parseFloat(inputDivisas?.value) || 0) * tasaActual;
                const sumOtrosBs = camposBs
                    .filter(c => c !== id)
                    .reduce((acc, cId) => acc + (parseFloat(document.getElementById(cId)?.value) || 0), 0);
                
                const pendiente = totalBs - sumOtrosBs - valorDivisasBs;
                el.value = (pendiente > 0 ? pendiente : 0).toFixed(2);
            });
        }
    });

    if (inputDivisas) {
        inputDivisas.addEventListener('input', function() {
            const totalBs = (window.totalVentaUSD || 0) * tasaActual;
            const valorDivisasBs = (parseFloat(this.value) || 0) * tasaActual;
            const sumPuntoMovil = (parseFloat(document.getElementById('in-punto-bs')?.value) || 0) + 
                                  (parseFloat(document.getElementById('in-pagomovil-bs')?.value) || 0);
            const resto = totalBs - valorDivisasBs - sumPuntoMovil;
            document.getElementById('in-efectivo-bs').value = (resto > 0 ? resto : 0).toFixed(2);
        });
    }
    
    console.log("POS Inicializado correctamente.");
});
