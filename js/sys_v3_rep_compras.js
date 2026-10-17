async function cargarReporteCompras() {
    const tbody = document.getElementById('tabla-reporte-compras');
    const empresaId = localStorage.getItem('youcontrol_empresa_id');

    if (!empresaId) {
        alert("No se encontró la empresa activa en el sistema.");
        return;
    }

    // Capturar texto directo de los inputs (Formato YYYY-MM-DD)
    const inputDesde = document.getElementById('filtro-desde')?.value;
    const inputHasta = document.getElementById('filtro-hasta')?.value;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Buscando registros de compras...</td></tr>`;

    try {
        const comprasRef = collection(db, "usuarios", empresaId, "compras");
        const querySnapshot = await getDocs(comprasRef);

        let totalUSD = 0;
        let cantidadCompras = 0;
        tbody.innerHTML = "";

        if (querySnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No se encontraron registros de compras.</td></tr>`;
            document.getElementById('kpi-total-usd').innerText = "$ 0.00";
            document.getElementById('kpi-total-compras').innerText = "0";
            return;
        }

        let comprasFiltradas = [];

        querySnapshot.forEach((docSnap) => {
            const c = docSnap.data();
            const id = docSnap.id;

            let fechaCompraObj = null;
            let fechaStr = "N/A";
            let fechaYMD = "";

            if (c.fecha && typeof c.fecha.toDate === 'function') {
                fechaCompraObj = c.fecha.toDate();
                fechaStr = fechaCompraObj.toLocaleString();
                // Extraer YYYY-MM-DD localmente evitando desfases de zona horaria
                const year = fechaCompraObj.getFullYear();
                const month = String(fechaCompraObj.getMonth() + 1).padStart(2, '0');
                const day = String(fechaCompraObj.getDate()).padStart(2, '0');
                fechaYMD = `${year}-${month}-${day}`;
            } else if (c.fecha) {
                fechaCompraObj = new Date(c.fecha);
                fechaStr = fechaCompraObj.toLocaleString();
                const year = fechaCompraObj.getFullYear();
                const month = String(fechaCompraObj.getMonth() + 1).padStart(2, '0');
                const day = String(fechaCompraObj.getDate()).padStart(2, '0');
                fechaYMD = `${year}-${month}-${day}`;
            }

            // Filtrar estrictamente por cadena de texto YYYY-MM-DD
            if (inputDesde && fechaYMD < inputDesde) return;
            if (inputHasta && fechaYMD > inputHasta) return;

            comprasFiltradas.push({ id, c, fechaStr });
        });

        if (comprasFiltradas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No hay compras en el rango de fechas seleccionado.</td></tr>`;
            document.getElementById('kpi-total-usd').innerText = "$ 0.00";
            document.getElementById('kpi-total-compras').innerText = "0";
            return;
        }

        comprasFiltradas.forEach(({ id, c, fechaStr }) => {
            cantidadCompras++;

            const nroControlStr = c.nro_control || c.nroCompra || c.factura || id.slice(0, 6);
            const tr = document.createElement('tr');
            tr.className = "fila-compra";

            if (c.anulada === true) {
                tr.classList.add('fila-anulada');
                tr.innerHTML = `
                    <td class="text-center"><input type="radio" name="select_compra" class="radio-compra" data-id="${id}" disabled></td>
                    <td>${fechaStr}</td>
                    <td><strong>${nroControlStr}</strong></td>
                    <td colspan="3" class="text-center font-bold text-red-600">*** COMPRA ANULADA ***</td>
                `;
            } else {
                const montoCompra = Number(c.total_usd || c.total || c.total_general || c.monto || 0);
                totalUSD += montoCompra;

                let productosHTML = `<ul class="lista-productos">`;
                const listaProds = c.productos || c.items || c.articulos || [];
                if (Array.isArray(listaProds) && listaProds.length > 0) {
                    listaProds.forEach(p => {
                        const nombreP = p.nombre || p.descripcion || p.titulo || 'Artículo';
                        const cantP = p.cantidad || p.qty || 1;
                        const precioP = Number(p.precio || p.costo || p.price || 0);
                        productosHTML += `<li>${nombreP} (${cantP} x $${precioP.toFixed(2)})</li>`;
                    });
                } else {
                    productosHTML += `<li>Compra registrada / Sin detalle interno</li>`;
                }
                productosHTML += `</ul>`;

                tr.innerHTML = `
                    <td class="text-center"><input type="radio" name="select_compra" class="radio-compra" data-id="${id}"></td>
                    <td>${fechaStr}</td>
                    <td><strong>${nroControlStr}</strong></td>
                    <td>${c.proveedor || c.nombre_proveedor || 'PROVEEDOR GENERAL'}</td>
                    <td>${productosHTML}</td>
                    <td class="text-right"><strong>$${montoCompra.toFixed(2)}</strong></td>
                `;

                tr.addEventListener('click', () => {
                    document.querySelectorAll('.fila-compra').forEach(f => f.classList.remove('seleccionada'));
                    document.querySelectorAll('.radio-compra').forEach(r => r.checked = false);

                    tr.classList.add('seleccionada');
                    const radio = tr.querySelector('.radio-compra');
                    radio.checked = true;
                    
                    compraSeleccionadaId = id;
                    compraSeleccionadaData = c;
                });
            }

            tbody.appendChild(tr);
        });

        document.getElementById('kpi-total-usd').innerText = `$ ${totalUSD.toFixed(2)}`;
        document.getElementById('kpi-total-compras').innerText = cantidadCompras;

    } catch (error) {
        console.error("Error cargando compras: ", error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 20px;">Error al conectar con la base de datos.</td></tr>`;
    }
}
