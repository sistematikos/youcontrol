import { db } from './firebase-config.js';
import { collection, doc, setDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const UID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
const tabla = document.getElementById('cuerpo-tabla');

// --- FUNCIÓN GLOBAL PARA AÑADIR FILAS ---
window.agregarFila = (barcode = "", sku = "", nombre = "", precio = "", stock = "", esExistente = false) => {
    if (tabla.querySelector('td[colspan]')) tabla.innerHTML = "";

    const tr = document.createElement('tr');
    tr.className = "fila-producto";
    tr.innerHTML = `
        <td><input type="text" class="input-table p-barcode" value="${barcode}" placeholder="Scanner"></td>
        <td>
            <input type="text" class="input-table p-sku" value="${sku}" placeholder="Ej: TRP01" 
            ${esExistente ? 'readonly style="background:#e2e8f0; color:#64748b;"' : ''}>
        </td>
        <td><input type="text" class="input-table p-nombre" value="${nombre}" placeholder="Descripción"></td>
        <td><input type="number" class="input-table p-precio" value="${precio}" step="0.01"></td>
        <td><input type="number" class="input-table p-stock" value="${stock}"></td>
        <td style="text-align: center;">
            <button class="btn-remove" onclick="window.eliminarProducto(this, '${sku}')">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    tabla.appendChild(tr);
    if(!esExistente) tr.querySelector('.p-barcode').focus();
};

// --- CARGAR PRODUCTOS AL INICIAR ---
async function cargarInventario() {
    try {
        const querySnapshot = await getDocs(collection(db, "usuarios", UID, "productos"));
        tabla.innerHTML = ""; 
        
        if (querySnapshot.empty) {
            window.agregarFila();
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const p = docSnap.data();
            window.agregarFila(p.codigo_barras || "", docSnap.id, p.nombre, p.precio, p.stock, true);
        });
    } catch (error) {
        console.error("Error:", error);
        tabla.innerHTML = "<tr><td colspan='6' style='color:red; text-align:center;'>Error de conexión</td></tr>";
    }
}

// --- ELIMINAR PRODUCTO ---
window.eliminarProducto = async (btn, id) => {
    if (id && confirm(`¿Eliminar ${id} definitivamente?`)) {
        try {
            await deleteDoc(doc(db, "usuarios", UID, "productos", id));
            btn.parentElement.parentElement.remove();
        } catch (e) { alert("Error al borrar"); }
    } else {
        btn.parentElement.parentElement.remove();
    }
};

// --- GUARDAR O ACTUALIZAR TODO ---
window.guardarInventario = async () => {
    const filas = document.querySelectorAll('.fila-producto');
    const btn = document.getElementById('btnGuardarTodo');
    btn.disabled = true;
    btn.innerHTML = 'PROCESANDO...';

    try {
        for (let fila of filas) {
            const barcode = fila.querySelector('.p-barcode').value.trim();
            const sku = fila.querySelector('.p-sku').value.trim();
            const nombre = fila.querySelector('.p-nombre').value.trim();
            const precio = parseFloat(fila.querySelector('.p-precio').value) || 0;
            const stock = parseInt(fila.querySelector('.p-stock').value) || 0;

            if (sku && nombre) {
                await setDoc(doc(db, "usuarios", UID, "productos", sku), {
                    codigo_barras: barcode,
                    nombre: nombre,
                    precio: precio,
                    stock: stock,
                    ultima_edicion: new Date().toISOString()
                }, { merge: true });
            }
        }
        alert("Sincronización completa");
        location.reload();
    } catch (e) {
        alert("Error al guardar");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> SINCRONIZAR CON FIREBASE';
    }
};

cargarInventario();
