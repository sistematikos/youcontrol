import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, increment, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// IMPORTANTE: Pon aquí tu configuración exacta de Firebase
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

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

async function cargarVentas() {
    const listaEl = document.getElementById('lista-ventas');
    if (!USER_ID) {
        listaEl.innerHTML = "<p>Error: No hay sesión de empresa activa.</p>";
        return;
    }

    try {
        // Buscamos las ventas. Si tienes un campo de fecha, puedes descomentar la línea del query para ordenarlas.
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
        const snap = await getDocs(ventasRef); 
        
        listaEl.innerHTML = ""; // Limpiamos el texto de "Cargando..."

        if (snap.empty) {
            listaEl.innerHTML = "<p style='text-align:center;'>No hay ventas registradas.</p>";
            return;
        }

        snap.forEach(fDoc => {
            const data = fDoc.data();
            const div = document.createElement('div');
            div.className = "factura-card";
            
            // Asumimos que la cantidad es 1 si no existe el campo cantidad en la BD
            const cantidadVendida = data.cantidad || 1; 
            
            div.innerHTML = `
                <div class="factura-info">
                    <strong>Factura: ${data.nro_factura || 'S/N'}</strong>
                    <span>Producto: ${data.nombre} (SKU: ${data.sku})</span>
                    <small>Cliente: ${data.nombre_cliente || 'General'} | Precio: $${data.precio}</small>
                </div>
                <div>
                    ${data.estado === 'anulada' ? 
                    '<span class="badge-anulada"><i class="fas fa-times-circle"></i> ANULADA</span>' : 
                    `<button class="btn-anular" onclick="anularVenta('${fDoc.id}', '${data.sku}', ${cantidadVendida})">
                        <i class="fas fa-undo-alt"></i> Anular
                    </button>`}
                </div>
            `;
            listaEl.appendChild(div);
        });

    } catch (error) {
        console.error("Error al cargar ventas:", error);
        listaEl.innerHTML = "<p>Error al cargar la base de datos.</p>";
    }
}

// Función global para que el botón HTML la pueda llamar
window.anularVenta = async function(ventaId, skuProducto, cantidad) {
    if (!confirm(`¿Estás seguro de anular esta venta?\n\nSe devolverán ${cantidad} unidades del producto al inventario.`)) return;

    try {
        // 1. Referencia al producto en el inventario usando el SKU
        const productoRef = doc(db, "usuarios", USER_ID, "productos", skuProducto);
        
        // 2. Incrementar el stock
        await updateDoc(productoRef, {
            stock: increment(cantidad)
        });

        // 3. Referencia a la venta para marcarla como anulada
        const ventaRef = doc(db, "usuarios", USER_ID, "ventas", ventaId);
        await updateDoc(ventaRef, {
            estado: "anulada"
        });

        alert("¡Venta anulada con éxito! El stock ha sido actualizado.");
        cargarVentas(); // Recargamos la lista para que el botón cambie a "ANULADA"

    } catch (error) {
        console.error("Error al anular:", error);
        alert("Hubo un error. Verifica la consola.");
    }
};

// Iniciar al cargar la página
document.addEventListener('DOMContentLoaded', cargarVentas);
