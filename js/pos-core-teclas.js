// Asegúrate de que las funciones importadas (ejecutarF4, ejecutarF5, etc.) 
// estén declaradas al inicio de este archivo pos-core.js

document.addEventListener('keydown', (event) => {
    // 1. Manejo del F5 (Control de refresco)
    if (event.key === 'F5') {
        event.preventDefault();
        event.stopImmediatePropagation();
        
        const modalPago = document.getElementById('modalPago');
        const estaEnPago = modalPago && (window.getComputedStyle(modalPago).display !== 'none');

        if (estaEnPago) {
            if (confirm("¿Deseas refrescar la página? Se perderán los datos del carrito.")) {
                window.location.reload();
            }
        } else {
            // Llamamos directamente a la función importada, no a window.ejecutarF5
            window.ejecutarF5(); 
        }
        return;
    }

    // 2. Manejo de otros comandos
    // Usamos las funciones importadas directamente
    const comandos = {
        'F4': window.ejecutarF4,
        'F6': window.ejecutarF6,
        'F9': window.abrirModalCobro
    };

    if (comandos[event.key]) {
        event.preventDefault();
        comandos[event.key]();
    }
}, true);
