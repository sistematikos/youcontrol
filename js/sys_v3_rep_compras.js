import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, runTransaction } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "youcontrol-1d60a.firebaseapp.com",
    projectId: "youcontrol-1d60a",
    storageBucket: "youcontrol-1d60a.appspot.com",
    messagingSenderId: "812100760013",
    appId: "1:812100760013:web:7574906aa285555faf5484"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let compraSeleccionadaId = null;
let compraSeleccionadaData = null;

document.getElementById('btn-buscar').addEventListener('click', cargarReporteCompras);

async function cargarReporteCompras() {
    const tbody = document.getElementById('tabla-reporte-compras');
    const empresaId = localStorage.getItem('youcontrol_empresa_id');

    if (!empresaId) {
        alert("No se encontró la empresa activa en el sistema.");
        return;
    }

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

        querySnapshot.forEach((docSnap) => {
            const c = docSnap.data();
            const id = docSnap.id;

            cantidadCompras++;

            let fechaStr = "N/A";
            if (c.fecha && typeof c.fecha.toDate === 'function') {
                fechaStr = c.fecha.toDate().toLocaleString();
            } else if (c.fecha) {
                fechaStr = c.fecha;
            }

            // LEER NRO DE CONTROL MANUAL (con respaldo si no existiera en registros viejos)
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

document.getElementById('btn-anular-seleccionada').addEventListener('click', async () => {
    if (!compraSeleccionadaId || !compraSeleccionadaData) {
        alert("Por favor selecciona una compra de la tabla para anular.");
        return;
    }

    const nroControlActual = compraSeleccionadaData.nro_control || compraSeleccionadaData.nro_compra || compraSeleccionadaId;

    if (!confirm(`¿Estás seguro de anular la compra con Nro. Control ${nroControlActual}? Esta acción restará los artículos del inventario y marcará la compra como anulada.`)) {
        return;
    }

    const empresaId = localStorage.getItem('youcontrol_empresa_id');

    try {
        await runTransaction(db, async (transaction) => {
            const listaProds = compraSeleccionadaData.productos || compraSeleccionadaData.items || compraSeleccionadaData.articulos || [];
            if (Array.isArray(listaProds)) {
                for (let prod of listaProds) {
                    const prodId = prod.id || prod.codigo || prod.sku;
                    if (prodId) {
                        const prodRef = doc(db, "usuarios", empresaId, "inventario", prodId);
                        const prodDoc = await transaction.get(prodRef);
                        
                        if (prodDoc.exists()) {
                            const stockActual = Number(prodDoc.data().stock || prodDoc.data().existencia || 0);
                            const cantidadRestar = Number(prod.cantidad || prod.qty || 1);
                            const nuevoStock = Math.max(0, stockActual - cantidadRestar);
                            
                            transaction.update(prodRef, { 
                                stock: nuevoStock,
                                existencia: nuevoStock 
                            });
                        }
                    }
                }
            }

            const compraRef = doc(db, "usuarios", empresaId, "compras", compraSeleccionadaId);
            transaction.update(compraRef, {
                anulada: true,
                total_usd: 0,
                total: 0,
                productos: []
            });
        });

        alert("Compra anulada con éxito, artículos restados del inventario y registro conservado.");
        compraSeleccionadaId = null;
        compraSeleccionadaData = null;
        cargarReporteCompras();

    } catch (error) {
        console.error("Error al anular la compra: ", error);
        alert("Hubo un error al procesar la anulación en la base de datos.");
    }
});

window.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('filtro-desde').value = hoy;
    document.getElementById('filtro-hasta').value = hoy;
    cargarReporteCompras();
});
