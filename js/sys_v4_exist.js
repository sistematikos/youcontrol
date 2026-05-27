import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

// Aseguramos que el script espere a que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const tablaExistencia = document.getElementById('tabla-existencia');
    const inputBusqueda = document.getElementById('input-busqueda');
    
    // IDs de las tarjetas (KPIs)
    const txtTotCosto = document.getElementById('tot-costo');
    const txtTotPvp = document.getElementById('tot-pvp');
    const txtTotGanancia = document.getElementById('tot-ganancia');
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
                    stock_min: 3,
                    costo: parseFloat(p.costo || 0),
                    pvp: parseFloat(p.precio || 0)
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

        let filtroCosto = 0;
        let filtroPvp = 0;
        let filtroAlertas = 0;

        if (productosFiltrados.length === 0) {
            tablaExistencia.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:20px;">No se encontraron productos.</td></tr>`;
        } else {
            productosFiltrados.forEach(p => {
                const totalInversionItem = p.stock * p.costo;
                filtroCosto += totalInversionItem;
                filtroPvp += (p.stock * p.pvp);
                if (p.stock <= p.stock_min) filtroAlertas++;

                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td style="font-family: monospace; font-weight:700;">${p.codigo}</td>
                    <td style="font-weight:600;">${p.nombre}</td>
                    <td class="text-center" style="font-weight:700;">${p.stock}</td>
                    <td>$ ${p.costo.toFixed(2)}</td>
                    <td>$ ${p.pvp.toFixed(2)}</td>
                    <td style="font-weight:700;">$ ${totalInversionItem.toFixed(2)}</td>
                    <td>${p.stock <= 0 ? '<span class="badge-stock stock-empty">Agotado</span>' : p.stock <= p.stock_min ? '<span class="badge-stock stock-low">Stock Bajo</span>' : '<span class="badge-stock stock-ok">Disponible</span>'}</td>
                `;
                tablaExistencia.appendChild(fila);
            });
        }

        txtTotCosto.innerText = `$ ${filtroCosto.toFixed(2)}`;
        txtTotPvp.innerText = `$ ${filtroPvp.toFixed(2)}`;
        txtTotGanancia.innerText = `$ ${(filtroPvp - filtroCosto).toFixed(2)}`;
        txtTotAlertas.innerText = filtroAlertas;
    }

    inputBusqueda.addEventListener('input', procesarYFiltrarInventario);
    inicializarExistencia();
});
