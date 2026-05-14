document.getElementById('btnCobrar').onclick = () => {
    if (carrito.length === 0) return;

    const ancho = 450;
    const alto = 700;
    const x = (window.screen.width / 2) - (ancho / 2);
    const y = (window.screen.height / 2) - (alto / 2);

    // Abrir ventana emergente real
    const popup = window.open(
        `checkout.html?total=${totalVentaUSD}&tasa=${tasaActual}`, 
        "PagoYouControl", 
        `width=${ancho},height=${alto},left=${x},top=${y},resizable=no,scrollbars=no,status=no,location=no,toolbar=no`
    );

    if (!popup) {
        alert("Por favor, permite las ventanas emergentes para este sitio.");
    }
};

// Escuchar cuando la ventana de pago termine
window.addEventListener("message", (event) => {
    if (event.data.status === 'success') {
        // Aquí ejecutas el vaciado del carrito y el registro en Firebase
        console.log("Venta recibida de la ventana externa", event.data.pago);
        alert("¡Venta procesada!");
        carrito = [];
        actualizarUI();
    }
}, false);
