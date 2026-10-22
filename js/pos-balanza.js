window.agregarCarritoConCantidad = (id, cantidadDada = 1) => {
    const p = productosMaster.find(x => x.id === id || x.barras === id);
    if (!p) return;

    const cantidadAsignada = parseFloat(cantidadDada) || 1;
    const itemExistente = carrito.find(c => c.id === p.id);
    const cantidadNueva = itemExistente ? itemExistente.cantidad + cantidadAsignada : cantidadAsignada;

    if (p.es_combo) {
        const check = validarStockCombo(p, cantidadNueva, productosMaster);
        if (!check.valido) {
            alert("⚠️ " + check.mensaje);
            return;
        }
    } else {
        const stockActual = Number(p.stock || 0);
        if (stockActual < cantidadNueva) {
            alert(`⚠️ Stock insuficiente de "${p.nombre}". Stock disponible: ${stockActual}`);
            return;
        }
    }

    if (itemExistente) {
        itemExistente.cantidad += cantidadAsignada;
    } else {
        carrito.push({ ...p, cantidad: cantidadAsignada });
    }

    window.actualizarCarritoUI();
};
