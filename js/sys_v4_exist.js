import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

// Aseguramos que el script espere a que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const tablaExistencia = document.getElementById('tabla-existencia');
    const inputBusqueda = document.getElementById('input-busqueda');
    
    // IDs de las tarjetas (KPIs) actualizados a métricas de inventario/stock
    const txtTotItems = document.getElementById('tot-costo');       // ID original de la 1era tarjeta
    const txtTotStock = document.getElementById('tot-pvp');         // ID original de la 2da tarjeta
    const txtTotSinStock = document.getElementById('tot-ganancia'); // ID original de la 3ra tarjeta
    const txtTotAlertas = document.getElementById('tot-alertas');

    let arrayProductosGlobal = [];

    function inicializarExistencia() {
        if (!USER_ID) {
            console.error("No se encontró el ID de usuario.");
            return;
        }
        
        const colRef = collection(db, "usuarios", USER_ID, "productos");

        onSnapshot(colRef, (snapshot) => {
            arrayProductosGlobal = [];
            
            snapshot.forEach((docSnap) => {
                const p = docSnap.data();
                arrayProductosGlobal.push({
                    codigo: p.sku || p.barras || "S/C",
                    nombre: p.nombre || "Producto sin descripción",
                    stock: parseInt(p.stock || 0),
                    stock_min: 3
                });
            });

            arrayProductosGlobal.sort((a, b) => a.nombre.localeCompare(b.nombre));
            procesarYFiltrarInventario();
        });
    }

    function procesarYFiltrarInventario() {
        const filtro = inputBusqueda.value.toLowerCase().trim();
        tablaExistencia.innerHTML = "";

        const productosFiltrados = arrayProductosGlobal.filter(p => 
            p.nombre.toLowerCase().includes(filtro) || p.codigo.toLowerCase().includes(filtro)
        );

        let totalStockAcumulado = 0;
        let totalSinStock = 0;
        let totalAlertas = 0;

        if (productosFiltrados.length === 0) {
            tablaExistencia.innerHTML = `<tr><td colspan="4" class="text-center" style="padding:20px;">No se encontraron productos.</td></tr>`;
        } else {
            productosFiltrados.forEach(p => {
                totalStockAcumulado += p.stock;
                if (p.stock <= 0) totalSinStock++;
                if (p.stock > 0 && p.stock <= p.stock_min) totalAlertas++;

                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td style="font-family: monospace; font-weight:700;">${p.codigo}</td>
                    <td style="font-weight:600;">${p.nombre}</td>
                    <td class="text-center" style="font-weight:700;">${p.stock}</td>
                    <td class="text-center">${p.stock <= 0 ? '<span class="badge-stock stock-empty">Agotado</span>' : p.stock <= p.stock_min ? '<span class="badge-stock stock-low">Stock Bajo</span>' : '<span class="badge-stock stock-ok">Disponible</span>'}</td>
                `;
                tablaExistencia.appendChild(fila);
            });
        }

        // Actualización de los valores en las tarjetas superiores
        txtTotItems.innerText = productosFiltrados.length;
        txtTotStock.innerText = totalStockAcumulado;
        txtTotSinStock.innerText = totalSinStock;
        txtTotAlertas.innerText = totalAlertas;
    }

    inputBusqueda.addEventListener('input', procesarYFiltrarInventario);
    inicializarExistencia();
});
